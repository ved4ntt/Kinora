// Kinora playback server: a small proxy + on-demand transcoder (ffmpeg -> HLS)
// Fixes streams that browsers cannot play directly: http links on https pages,
// links that need special headers, and files with codecs browsers do not support (HEVC, DTS, AC3...).
import express from 'express';
import { spawn, execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, rmSync, readdirSync, statSync } from 'node:fs';
import { Readable } from 'node:stream';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import path from 'node:path';

const KEY = process.env.KINORA_KEY;
const PORT = process.env.PORT || 8787;
const TMP = process.env.TMP_DIR || '/tmp/kinora';
const ORIGIN = process.env.ALLOW_ORIGIN || '*';
const MAX_JOBS = +(process.env.MAX_JOBS || 2);
if (!KEY) { console.error('Set the KINORA_KEY environment variable (a long random secret).'); process.exit(1); }
mkdirSync(TMP, { recursive: true });

const app = express();
app.use((req, res, next) => {
  res.set({
    'Access-Control-Allow-Origin': ORIGIN,
    'Access-Control-Allow-Headers': 'Range, Content-Type',
    'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  });
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
const auth = (req, res, next) => (req.query.k === KEY ? next() : res.status(401).send('Bad key'));
const decodeHeaders = (q) => { try { return q ? JSON.parse(Buffer.from(q, 'base64').toString()) : {}; } catch { return {}; } };

// Block requests to private networks so this server cannot be used to reach internal services.
const isPrivate = (ip) => /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|::1$|fc|fd|fe80)/i.test(ip);
async function safeUrl(u) {
  try {
    const url = new URL(u);
    if (!/^https?:$/.test(url.protocol)) return false;
    const ip = isIP(url.hostname) ? url.hostname : (await lookup(url.hostname)).address;
    return !isPrivate(ip);
  } catch { return false; }
}

app.get('/health', auth, (req, res) => res.json({ ok: true, jobs: jobs.size }));

// Plain pass-through with Range support and CORS, optionally adding request headers.
app.get('/proxy', auth, async (req, res) => {
  const u = req.query.u;
  if (!(await safeUrl(u))) return res.status(400).send('Bad url');
  const headers = { ...decodeHeaders(req.query.h) };
  if (req.headers.range) headers.Range = req.headers.range;
  try {
    const r = await fetch(u, { headers, redirect: 'follow' });
    res.status(r.status);
    for (const k of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
      const v = r.headers.get(k); if (v) res.set(k, v);
    }
    if (!r.body) return res.end();
    const s = Readable.fromWeb(r.body);
    req.on('close', () => s.destroy());
    s.pipe(res);
  } catch { res.status(502).send('Upstream error'); }
});

// ---- transcoding jobs ----
const jobs = new Map();
const headerArg = (h) => Object.entries(h).map(([k, v]) => `${k}: ${v}\r\n`).join('');

function probe(u, hs) {
  return new Promise((resolve) => {
    const args = ['-v', 'error', ...(hs ? ['-headers', hs] : []), '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_name,pix_fmt', '-of', 'csv=p=0', u];
    execFile('ffprobe', args, { timeout: 20000 }, (err, out) => {
      const [codec = '', pix = ''] = (out || '').trim().split(',');
      resolve({ codec, pix });
    });
  });
}

async function startJob(u, headers) {
  const id = createHash('sha1').update(u + JSON.stringify(headers)).digest('hex').slice(0, 16);
  let job = jobs.get(id);
  if (job) { job.last = Date.now(); return job; }
  if ([...jobs.values()].filter((j) => !j.done).length >= MAX_JOBS) throw new Error('busy');
  const dir = path.join(TMP, id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const hs = headerArg(headers);
  const { codec, pix } = await probe(u, hs);
  const copyVideo = codec === 'h264' && (pix === 'yuv420p' || pix === '');
  const args = ['-hide_banner', '-loglevel', 'error', ...(hs ? ['-headers', hs] : []),
    '-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5', '-i', u,
    '-map', '0:v:0', '-map', '0:a:0?', '-sn',
    ...(copyVideo ? ['-c:v', 'copy']
      : ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-vf', "scale='min(1920,iw)':-2"]),
    '-c:a', 'aac', '-ac', '2', '-b:a', '160k',
    '-f', 'hls', '-hls_time', '4', '-hls_list_size', '0', '-hls_playlist_type', 'event',
    '-hls_flags', 'independent_segments', '-hls_segment_filename', path.join(dir, 'seg%05d.ts'),
    path.join(dir, 'index.m3u8')];
  const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
  job = { id, dir, proc, last: Date.now(), started: Date.now(), done: false, err: '' };
  proc.stderr.on('data', (d) => { job.err = (job.err + d).slice(-800); });
  proc.on('close', () => { job.done = true; });
  jobs.set(id, job);
  return job;
}

// Entry point used by the Kinora web app: starts (or reuses) a job and redirects to its playlist.
app.get('/stream.m3u8', auth, async (req, res) => {
  const u = req.query.u;
  if (!(await safeUrl(u))) return res.status(400).send('Bad url');
  try {
    const job = await startJob(u, decodeHeaders(req.query.h));
    const playlist = path.join(job.dir, 'index.m3u8');
    for (let i = 0; i < 90; i++) {
      if (existsSync(playlist) && readFileSync(playlist, 'utf8').includes('#EXTINF')) {
        return res.redirect(302, `/hls/${job.id}/index.m3u8`);
      }
      if (job.done) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    res.status(502).send('Could not start playback. ' + job.err);
  } catch (e) {
    res.status(e.message === 'busy' ? 503 : 500).send(e.message === 'busy' ? 'Server is busy, try again in a moment' : 'Error');
  }
});

app.use('/hls/:id', (req, res, next) => {
  const j = jobs.get(req.params.id); if (j) j.last = Date.now();
  res.set('Cache-Control', 'no-cache');
  next();
});
app.use('/hls', express.static(TMP));

// Stop idle jobs and delete old files.
setInterval(() => {
  const now = Date.now();
  for (const [id, j] of jobs) {
    if (!j.done && now - j.last > 5 * 60_000) j.proc.kill('SIGKILL');
    if (now - j.last > 2 * 3600_000) { rmSync(j.dir, { recursive: true, force: true }); jobs.delete(id); }
  }
  for (const d of readdirSync(TMP)) {
    const p = path.join(TMP, d);
    if (!jobs.has(d) && now - statSync(p).mtimeMs > 3600_000) rmSync(p, { recursive: true, force: true });
  }
}, 60_000);

app.listen(PORT, () => console.log(`Kinora server listening on ${PORT}`));
