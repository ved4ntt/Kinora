// Built-in streaming server for the Windows app (same idea as the Stremio streaming server).
// Serves the website, proxies streams (several connections at once, so slow hosts feel fast and seeking works),
// and converts unsupported formats to HLS with ffmpeg (video is copied whenever the player can decode it).
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
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const decodeHeaders = (q) => {
  try {
    const h = q ? JSON.parse(Buffer.from(q, 'base64').toString()) : {};
    if (!h['User-Agent'] && !h['user-agent']) h['User-Agent'] = BROWSER_UA;
    if (!h['Accept'] && !h['accept']) h['Accept'] = '*/*';
    return h;
  } catch {
    return { 'User-Agent': BROWSER_UA, 'Accept': '*/*' };
  }
};
const headerArg = (h) => Object.entries(h).map(([k, v]) => `${k}: ${v}\r\n`).join('');

function startServer({ www, tmp, port = 38787 }) {
  const KEY = crypto.randomBytes(16).toString('hex');
  const FFMPEG = bin('ffmpeg-static', 'ffmpeg');
  const FFPROBE = bin('ffprobe-static', 'ffprobe');
  fs.mkdirSync(tmp, { recursive: true });
  const jobs = new Map();
  const metaCache = new Map();
  const caps = { hevc: false }; // the page tells us whether this PC can decode HEVC, so we can copy it instead of re-encoding
  const app = express();

  // The server's own /proxy address is allowed, so a converted stream can read through the fast proxy too.
  async function safeUrl(u) {
    try {
      const url = new URL(u);
      if (!/^https?:$/.test(url.protocol)) return false;
      if (url.hostname === '127.0.0.1' && String(url.port) === String(app.locals.port) && url.pathname === '/proxy') return true;
      const ip = net.isIP(url.hostname) ? url.hostname : (await dns.lookup(url.hostname)).address;
      return !isPrivate(ip);
    } catch { return false; }
  }

  // The page asks for the key; other websites cannot read it (no CORS headers are sent).
  app.get('/native.json', (req, res) => { res.set('Cache-Control', 'no-store'); res.json({ url: `http://127.0.0.1:${app.locals.port}`, key: KEY }); });
  const auth = (req, res, next) => (req.query.k === KEY ? next() : res.status(401).send('Bad key'));

  app.get('/health', auth, (req, res) => res.json({ ok: true }));
  app.get('/cfg', auth, (req, res) => { if (req.query.hevc !== undefined) caps.hevc = req.query.hevc === '1'; res.json(caps); });

  /* ---------- fast proxy: asks the host for several pieces at once and hands them over in order ---------- */
  async function rangeMeta(u, headers) {
    const key = u + '|' + JSON.stringify(headers);
    const c = metaCache.get(key);
    if (c && Date.now() - c.t < 600000) return c;
    const m = { size: 0, type: '', ranges: false, t: Date.now() };
    try {
      const r = await fetch(u, { headers: { ...headers, Range: 'bytes=0-0' }, redirect: 'follow' });
      const total = /\/(\d+)$/.exec(r.headers.get('content-range') || '');
      m.type = r.headers.get('content-type') || '';
      if (r.status === 206 && total) { m.size = +total[1]; m.ranges = true; }
      try { await r.body.cancel(); } catch {}
    } catch {}
    metaCache.set(key, m);
    return m;
  }

  async function pump(u, headers, start, end, res, signal, begin) {
    const PAR = 4, CH = 4 * 1024 * 1024, FIRST = 384 * 1024;
    const q = [];
    let next = start;
    const grab = (a, len) => {
      const b = Math.min(a + len - 1, end);
      const once = () => fetch(u, { headers: { ...headers, Range: `bytes=${a}-${b}` }, redirect: 'follow', signal }).then(async (r) => {
        if (r.status !== 206 && !(r.status === 200 && a === 0 && b === end)) throw new Error('status ' + r.status);
        return Buffer.from(await r.arrayBuffer());
      });
      const p = once().catch(() => (signal && signal.aborted ? Promise.reject(new Error('aborted')) : once()));
      p.catch(() => {});
      return p;
    };
    const fill = () => { while (q.length < PAR && next <= end) { const len = next === start ? FIRST : CH; q.push(grab(next, len)); next += len; } };
    fill();
    let first = true;
    while (q.length) {
      const buf = await q.shift();
      // the headers are only sent once the host has really answered, so a host that refuses this way can still fall back to a plain pass-through
      if (first) { first = false; begin(); }
      fill();
      if (!res.write(buf)) await new Promise((r) => res.once('drain', r));
    }
    res.end();
  }

  async function passThrough(req, res, u, headers, ac) {
    if (req.headers.range) headers.Range = req.headers.range;
    try {
      const r = await fetch(u, { headers, redirect: 'follow', signal: ac.signal });
      res.status(r.status);
      for (const k of ['content-type', 'content-length', 'content-range', 'accept-ranges']) { const v = r.headers.get(k); if (v) res.set(k, v); }
      if (!res.get('accept-ranges')) res.set('Accept-Ranges', 'bytes');
      if (!r.body) return res.end();
      const stream = Readable.fromWeb(r.body);
      stream.on('error', () => {
        try { res.destroy(); } catch {}
      });
      res.on('close', () => {
        try { stream.destroy(); } catch {}
      });
      stream.pipe(res);
    } catch (e) {
      if (ac.signal.aborted || e?.name === 'AbortError') return;
      if (!res.headersSent && !res.writableEnded && !res.destroyed) {
        try { res.status(502).send('Upstream error'); } catch {}
      } else {
        try { res.end(); } catch {}
      }
    }
  }

  app.get('/proxy', auth, async (req, res) => {
    const u = req.query.u;
    if (!(await safeUrl(u))) return res.status(400).send('Bad url');
    const headers = { ...decodeHeaders(req.query.h) };
    const ac = new AbortController();
    res.on('close', () => {
      try {
        if (!ac.signal.aborted) ac.abort();
      } catch {}
    });
    // Big files: ask the host for several pieces at once (many hosts slow down each single connection, this is much faster and seeking is quick).
    // If the host does not like that, the plain pass-through below takes over.
    const rg = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    try {
      const m = await rangeMeta(u, headers);
      if (m.ranges && m.size > 8 * 1024 * 1024 && !ac.signal.aborted) {
        let start = 0, end = m.size - 1;
        if (rg) {
          if (rg[1] !== '') { start = +rg[1]; if (rg[2] !== '') end = Math.min(+rg[2], m.size - 1); }
          else if (rg[2] !== '') start = Math.max(0, m.size - +rg[2]);
        }
        if (start > end || start >= m.size) return res.status(416).set('Content-Range', 'bytes */' + m.size).end();
        let began = false;
        try {
          await pump(u, headers, start, end, res, ac.signal, () => {
            began = true;
            if (rg) { res.status(206); res.set('Content-Range', `bytes ${start}-${end}/${m.size}`); } else res.status(200);
            res.set({ 'Content-Type': m.type || 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Length': String(end - start + 1) });
          });
          return;
        } catch {
          if (began || ac.signal.aborted) { try { res.destroy(); } catch {} return; }
        }
      }
    } catch {}
    // Direct robust streaming pass-through for reliable seeking and CDN compatibility
    return passThrough(req, res, u, headers, ac);
  });

  /* ---------- conversion to HLS ---------- */
  function probe(u, hs) {
    return new Promise((resolve) => {
      execFile(FFPROBE, ['-v', 'error', '-analyzeduration', '3000000', '-probesize', '5000000', ...(hs ? ['-headers', hs] : []), '-show_entries', 'stream=codec_type,codec_name,pix_fmt', '-of', 'csv=p=0', u], { timeout: 20000 }, (err, out) => {
        const rows = (out || '').trim().split(/\r?\n/).map((l) => l.split(','));
        const v = rows.find((r) => r[0] === 'video') || [];
        const a = rows.find((r) => r[0] === 'audio') || [];
        resolve({ codec: v[1] || '', pix: v[2] || '', acodec: a[1] || '' });
      });
    });
  }

  async function startJob(u, headers) {
    const id = crypto.createHash('sha1').update(u + JSON.stringify(headers) + (caps.hevc ? 'h' : '')).digest('hex').slice(0, 16);
    let job = jobs.get(id);
    if (job) { job.last = Date.now(); return job; }
    const dir = path.join(tmp, id);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const hs = headerArg(headers);
    const { codec, pix, acodec } = await probe(u, hs);
    const hevcCopy = caps.hevc && codec === 'hevc' && /^yuv420p(10le)?$/.test(pix);
    const copyVideo = (codec === 'h264' && (pix === 'yuv420p' || pix === '')) || hevcCopy;
    const args = ['-hide_banner', '-loglevel', 'error', '-analyzeduration', '3000000', '-probesize', '6000000',
      '-user_agent', BROWSER_UA,
      ...(copyVideo ? [] : ['-hwaccel', 'auto']),
      ...(hs ? ['-headers', hs] : []),
      '-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5', '-i', u,
      '-map', '0:v:0', '-map', '0:a:0?', '-sn',
      ...(copyVideo ? ['-c:v', 'copy', ...(hevcCopy ? ['-tag:v', 'hvc1'] : [])] : ['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '25', '-pix_fmt', 'yuv420p', '-vf', "scale='min(1920,iw)':-2"]),
      ...(acodec === 'aac' ? ['-c:a', 'copy'] : ['-c:a', 'aac', '-ac', '2', '-b:a', '192k']),
      '-f', 'hls', '-hls_time', '4', '-hls_list_size', '0', '-hls_playlist_type', 'event', '-hls_flags', 'independent_segments+temp_file',
      ...(hevcCopy ? ['-hls_segment_type', 'fmp4', '-hls_fmp4_init_filename', 'init.mp4', '-hls_segment_filename', path.join(dir, 'seg%05d.m4s')] : ['-hls_segment_filename', path.join(dir, 'seg%05d.ts')]),
      path.join(dir, 'index.m3u8')];
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
      for (let i = 0; i < 120; i++) {
        if (fs.existsSync(playlist) && fs.readFileSync(playlist, 'utf8').includes('#EXTINF')) return res.redirect(302, `/hls/${job.id}/index.m3u8`);
        if (job.done) break;
        await new Promise((r) => setTimeout(r, 250));
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
