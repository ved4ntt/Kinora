// Built-in streaming server for the Windows app (same idea as the Stremio streaming server).
// Serves the website, proxies streams, and converts unsupported formats to HLS with ffmpeg.
const express = require('express');
const { spawn, execFile } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const dns = require('dns').promises;
const net = require('net');

function bin(name, fallback) {
  try {
    const m = require(name);
    return (typeof m === 'string' ? m : m.path).replace('app.asar', 'app.asar.unpacked');
  } catch { return fallback; }
}

const isPrivate = (ip) => /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|::1$|fc|fd|fe80)/i.test(ip);
async function safeUrl(u) {
  try {
    const url = new URL(u);
    if (!/^https?:$/.test(url.protocol)) return false;
    const ip = net.isIP(url.hostname) ? url.hostname : (await dns.lookup(url.hostname)).address;
    return !isPrivate(ip);
  } catch { return false; }
}
const decodeHeaders = (q) => { try { return q ? JSON.parse(Buffer.from(q, 'base64').toString()) : {}; } catch { return {}; } };
const headerArg = (h) => Object.entries(h).map(([k, v]) => `${k}: ${v}\r\n`).join('');

function startServer({ www, tmp, port = 38787 }) {
  const KEY = crypto.randomBytes(16).toString('hex');
  const FFMPEG = bin('ffmpeg-static', 'ffmpeg');
  const FFPROBE = bin('ffprobe-static', 'ffprobe');
  fs.mkdirSync(tmp, { recursive: true });
  const jobs = new Map();
  const app = express();

  // The page asks for the key; other websites cannot read it (no CORS headers are sent).
  app.get('/native.json', (req, res) => { res.set('Cache-Control', 'no-store'); res.json({ url: `http://127.0.0.1:${app.locals.port}`, key: KEY }); });
  const auth = (req, res, next) => (req.query.k === KEY ? next() : res.status(401).send('Bad key'));

  app.get('/health', auth, (req, res) => res.json({ ok: true }));

  app.get('/proxy', auth, async (req, res) => {
    const u = req.query.u;
    if (!(await safeUrl(u))) return res.status(400).send('Bad url');
    const headers = { ...decodeHeaders(req.query.h) };
    if (req.headers.range) headers.Range = req.headers.range;
    try {
      const r = await fetch(u, { headers, redirect: 'follow' });
      res.status(r.status);
      for (const k of ['content-type', 'content-length', 'content-range', 'accept-ranges']) { const v = r.headers.get(k); if (v) res.set(k, v); }
      if (!r.body) return res.end();
      const s = Readable.fromWeb(r.body);
      req.on('close', () => s.destroy());
      s.pipe(res);
    } catch { res.status(502).send('Upstream error'); }
  });

  function probe(u, hs) {
    return new Promise((resolve) => {
      execFile(FFPROBE, ['-v', 'error', ...(hs ? ['-headers', hs] : []), '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,pix_fmt', '-of', 'csv=p=0', u], { timeout: 20000 }, (err, out) => {
        const [codec = '', pix = ''] = (out || '').trim().split(',');
        resolve({ codec, pix });
      });
    });
  }

  async function startJob(u, headers) {
    const id = crypto.createHash('sha1').update(u + JSON.stringify(headers)).digest('hex').slice(0, 16);
    let job = jobs.get(id);
    if (job) { job.last = Date.now(); return job; }
    const dir = path.join(tmp, id);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const hs = headerArg(headers);
    const { codec, pix } = await probe(u, hs);
    const copyVideo = codec === 'h264' && (pix === 'yuv420p' || pix === '');
    const args = ['-hide_banner', '-loglevel', 'error', ...(hs ? ['-headers', hs] : []),
      '-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5', '-i', u,
      '-map', '0:v:0', '-map', '0:a:0?', '-sn',
      ...(copyVideo ? ['-c:v', 'copy'] : ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-vf', "scale='min(1920,iw)':-2"]),
      '-c:a', 'aac', '-ac', '2', '-b:a', '160k',
      '-f', 'hls', '-hls_time', '4', '-hls_list_size', '0', '-hls_playlist_type', 'event',
      '-hls_flags', 'independent_segments', '-hls_segment_filename', path.join(dir, 'seg%05d.ts'), path.join(dir, 'index.m3u8')];
    const proc = spawn(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    job = { id, dir, proc, last: Date.now(), done: false, err: '' };
    proc.stderr.on('data', (d) => { job.err = (job.err + d).slice(-800); });
    proc.on('error', (e) => { job.done = true; job.err = String(e); });
    proc.on('close', () => { job.done = true; });
    jobs.set(id, job);
    return job;
  }

  app.get('/stream.m3u8', auth, async (req, res) => {
    const u = req.query.u;
    if (!(await safeUrl(u))) return res.status(400).send('Bad url');
    try {
      const job = await startJob(u, decodeHeaders(req.query.h));
      const playlist = path.join(job.dir, 'index.m3u8');
      for (let i = 0; i < 90; i++) {
        if (fs.existsSync(playlist) && fs.readFileSync(playlist, 'utf8').includes('#EXTINF')) return res.redirect(302, `/hls/${job.id}/index.m3u8`);
        if (job.done) break;
        await new Promise((r) => setTimeout(r, 500));
      }
      res.status(502).send('Could not start playback. ' + job.err);
    } catch { res.status(500).send('Error'); }
  });

  app.use('/hls/:id', (req, res, next) => { const j = jobs.get(req.params.id); if (j) j.last = Date.now(); res.set('Cache-Control', 'no-cache'); next(); });
  app.use('/hls', express.static(tmp));
  app.use(express.static(www));

  setInterval(() => {
    const now = Date.now();
    for (const [id, j] of jobs) {
      if (!j.done && now - j.last > 5 * 60000) j.proc.kill('SIGKILL');
      if (now - j.last > 2 * 3600000) { fs.rmSync(j.dir, { recursive: true, force: true }); jobs.delete(id); }
    }
  }, 60000).unref();

  return new Promise((resolve, reject) => {
    const tryListen = (p) => {
      const s = app.listen(p, '127.0.0.1', () => { app.locals.port = p; resolve({ port: p, key: KEY, server: s }); });
      s.on('error', (e) => { if (e.code === 'EADDRINUSE' && p < port + 10) tryListen(p + 1); else reject(e); });
    };
    tryListen(port);
  });
}

module.exports = { startServer };
