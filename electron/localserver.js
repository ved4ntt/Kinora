// Built-in streaming server for the Windows app (same idea as the Stremio streaming server).
// Serves the website, proxies streams and converts unsupported formats to HLS with ffmpeg.
//
// Proxy rules (this is what makes the seek bar cover the whole film):
//  - It learns once per source whether the host really supports byte ranges (a 1-byte ranged request) and the exact file size.
//  - Every ranged request from the player is answered with a correct 206 + Content-Range + Content-Length.
//  - A host that ignores Range (answers 200 with the whole file) is emulated: the proxy skips the bytes itself,
//    so the player can still jump anywhere in a file whose size is known.
//  - A broken connection in the middle of a stream is resumed from the exact byte, the player never notices.
//  - HLS playlists that need special headers are rewritten so every playlist, key and segment goes through the same proxy.
//  - Nothing is downloaded ahead of what the player asks for: no full-file downloads, no oversized buffers.
const express = require('express');
const { spawn, execFile } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// The proxy must see the real bytes: never let the host compress them (it would break sizes and ranges).
const UP = (h) => { const o = { ...h }; for (const k of Object.keys(o)) if (/^accept-encoding$/i.test(k)) delete o[k]; o['Accept-Encoding'] = 'identity'; return o; };
const MIME = { mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mkv: 'video/x-matroska', mov: 'video/quicktime', ts: 'video/mp2t', m3u8: 'application/vnd.apple.mpegurl', mp3: 'audio/mpeg', m4a: 'audio/mp4' };
const mimeFor = (type, u) => {
  if (type && !/octet-stream|text\/|application\/(json|xml)/i.test(type)) return type;
  const m = /\.([a-z0-9]{2,4})(?:[?#]|$)/i.exec(u || '');
  return (m && MIME[m[1].toLowerCase()]) || type || 'video/mp4';
};

function startServer({ www, tmp, port = 38787 }) {
  const KEY = crypto.randomBytes(16).toString('hex');
  const FFMPEG = bin('ffmpeg-static', 'ffmpeg');
  const FFPROBE = bin('ffprobe-static', 'ffprobe');
  fs.mkdirSync(tmp, { recursive: true });
  const jobs = new Map();
  const metaCache = new Map();
  const hostOk = new Map();
  const caps = { hevc: false, hw: 'none' }; // hevc: the page tells us whether this PC can decode HEVC; hw: which hardware video encoder works here
  const app = express();

  // The server's own /proxy address is allowed, so a converted stream can read through the fast proxy too.
  async function safeUrl(u) {
    try {
      const url = new URL(u);
      if (!/^https?:$/.test(url.protocol)) return false;
      if (url.hostname === '127.0.0.1' && String(url.port) === String(app.locals.port) && url.pathname === '/proxy') return true;
      const c = hostOk.get(url.hostname);
      if (c && Date.now() - c.t < 300000) return c.ok;
      const ip = net.isIP(url.hostname) ? url.hostname : (await dns.lookup(url.hostname)).address;
      const ok = !isPrivate(ip);
      hostOk.set(url.hostname, { ok, t: Date.now() });
      return ok;
    } catch { return false; }
  }

  app.get('/native.json', (req, res) => { res.set('Cache-Control', 'no-store'); res.json({ url: `http://127.0.0.1:${app.locals.port}`, key: KEY }); });
  const auth = (req, res, next) => (req.query.k === KEY ? next() : res.status(401).send('Bad key'));
  app.get('/health', auth, (req, res) => res.json({ ok: true }));
  app.get('/cfg', auth, (req, res) => { if (req.query.hevc !== undefined) caps.hevc = req.query.hevc === '1'; res.json(caps); });

  /* ---------------------------------------------------------------- proxy ---------------------------------------------------------------- */
  const keyOf = (u, h) => u + '|' + JSON.stringify(h);

  // One tiny ranged request tells us: are ranges honoured, how big is the file, what is the real address after redirects.
  async function getMeta(u, headers, signal) {
    const key = keyOf(u, headers);
    const hit = metaCache.get(key);
    if (hit && Date.now() - hit.t < 600000) return hit;
    const r = await fetch(u, { headers: { ...UP(headers), Range: 'bytes=0-0' }, redirect: 'follow', signal });
    const meta = { size: 0, ranges: false, type: r.headers.get('content-type') || '', final: r.url || u, t: Date.now() };
    const cr = /\/(\d+)$/.exec(r.headers.get('content-range') || '');
    if (r.status === 206 && cr) { meta.size = +cr[1]; meta.ranges = true; }
    else if (r.status === 200) { meta.size = +(r.headers.get('content-length') || 0); meta.ranges = false; }
    else if (r.status >= 400) { try { r.body && r.body.cancel(); } catch {} throw new Error('status ' + r.status); }
    try { r.body && r.body.cancel(); } catch {}
    metaCache.set(key, meta);
    return meta;
  }

  const parseRange = (h, size) => {
    const m = /^bytes=(\d*)-(\d*)$/.exec(h || '');
    if (!m || (m[1] === '' && m[2] === '')) return null;
    if (m[1] === '') { const n = +m[2]; return size ? { start: Math.max(0, size - n), end: size - 1 } : null; }
    const start = +m[1];
    const end = m[2] === '' ? (size ? size - 1 : Infinity) : (size ? Math.min(+m[2], size - 1) : +m[2]);
    return { start, end };
  };

  const waitDrain = (res) => new Promise((ok) => { const f = () => { res.off('drain', f); res.off('close', f); ok(); }; res.once('drain', f); res.once('close', f); });

  // Sends bytes start..end (inclusive), reconnecting from the exact byte when the host drops the connection.
  async function streamRange(u, headers, start, end, res, ac, first) {
    let pos = start, tries = 0, resp = first || null;
    while (pos <= end && !ac.signal.aborted && !res.destroyed) {
      try {
        if (!resp) {
          resp = await fetch(u, { headers: { ...UP(headers), Range: `bytes=${pos}-${end === Infinity ? '' : end}` }, redirect: 'follow', signal: ac.signal });
          if (resp.status !== 206 && !(resp.status === 200 && pos === 0)) throw new Error('status ' + resp.status);
        }
        const reader = resp.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          let buf = Buffer.from(value.buffer, value.byteOffset, value.length);
          if (end !== Infinity && pos + buf.length - 1 > end) buf = buf.subarray(0, end - pos + 1);
          pos += buf.length;
          if (!res.write(buf)) await waitDrain(res);
          if (res.destroyed || pos > end) break;
        }
        resp = null;
        if (pos <= end && end !== Infinity) throw new Error('short');
        if (end === Infinity) break;
      } catch (e) {
        resp = null;
        if (ac.signal.aborted || res.destroyed) return pos;
        if (++tries > 4) throw e;
        await sleep(200 * tries);
      }
    }
    return pos;
  }

  // The host ignores Range: read the stream from the start and drop the bytes before the one the player wants.
  async function streamSkip(u, headers, start, end, res, ac) {
    const r = await fetch(u, { headers: UP(headers), redirect: 'follow', signal: ac.signal });
    if (r.status !== 200 || !r.body) throw new Error('status ' + r.status);
    res.__begin && res.__begin();
    const reader = r.body.getReader();
    let pos = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      let buf = Buffer.from(value.buffer, value.byteOffset, value.length);
      const a = pos, b = pos + buf.length - 1;
      pos += buf.length;
      if (b < start) continue;
      if (a < start) buf = buf.subarray(start - a);
      if (end !== Infinity && b > end) buf = buf.subarray(0, buf.length - (b - end));
      if (buf.length && !res.write(buf)) await waitDrain(res);
      if (res.destroyed || b >= end) { try { reader.cancel(); } catch {} break; }
    }
    res.end();
  }

  // For jumps deep into a big file: several pieces are requested together and handed over in order (first piece is small, so playback starts fast).
  async function pump(u, headers, start, end, res, signal, begin, sent) {
    const PAR = 4, CH = 4 * 1024 * 1024, FIRST = 384 * 1024;
    const q = [];
    let next = start;
    const grab = (a, len) => {
      const b = Math.min(a + len - 1, end);
      const once = () => fetch(u, { headers: { ...UP(headers), Range: `bytes=${a}-${b}` }, redirect: 'follow', signal }).then(async (r) => {
        if (r.status !== 206) throw new Error('status ' + r.status);
        return Buffer.from(await r.arrayBuffer());
      });
      const p = once().catch(() => (signal && signal.aborted ? Promise.reject(new Error('aborted')) : once()));
      p.catch(() => {});
      return p;
    };
    const fill = () => { while (q.length < PAR && next <= end) { const len = next === start ? FIRST : CH; q.push(grab(next, len)); next += len; } };
    fill();
    let firstDone = false;
    while (q.length) {
      const buf = await q.shift();
      if (!firstDone) { firstDone = true; begin(); }
      fill();
      if (!res.write(buf)) await waitDrain(res);
      sent.n += buf.length;
      if (res.destroyed) return;
    }
    res.end();
  }

  async function serveM3u8(req, res, u, headers, ac) {
    try {
      const r = await fetch(u, { headers: UP(headers), redirect: 'follow', signal: ac.signal });
      if (!r.ok) return res.status(r.status).send('Upstream error');
      const text = await r.text();
      const base = r.url || u;
      const hq = req.query.h ? '&h=' + encodeURIComponent(req.query.h) : '';
      const prox = (x) => { try { return `/proxy?k=${KEY}&u=${encodeURIComponent(new URL(x, base).href)}${hq}`; } catch { return x; } };
      const out = text.split(/\r?\n/).map((l) => {
        if (!l.trim()) return l;
        if (l.startsWith('#')) return l.replace(/URI="([^"]+)"/g, (m, x) => `URI="${prox(x)}"`);
        return prox(l.trim());
      }).join('\n');
      res.set({ 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-cache' }).send(out);
    } catch (e) {
      if (!ac.signal.aborted && !res.headersSent) res.status(502).send('Upstream error');
    }
  }

  app.get('/proxy', auth, async (req, res) => {
    const u = req.query.u;
    if (!(await safeUrl(u))) return res.status(400).send('Bad url');
    const headers = { ...decodeHeaders(req.query.h) };
    const ac = new AbortController();
    res.on('close', () => { try { if (!ac.signal.aborted) ac.abort(); } catch {} });
    if (/\.m3u8(\?|#|$)/i.test(u)) return serveM3u8(req, res, u, headers, ac);

    const key = keyOf(u, headers);
    const wantsRange = !!req.headers.range;
    let meta = metaCache.get(key);
    if (meta && Date.now() - meta.t > 600000) meta = null;
    try {
      // Plain request or the very first bytes of a source we have not seen yet: go straight to the host (nothing waits for a probe) and learn from the answer.
      if (!meta && (!wantsRange || /^bytes=0-/.test(req.headers.range))) {
        const rq = wantsRange ? { ...UP(headers), Range: req.headers.range } : UP(headers);
        const r = await fetch(u, { headers: rq, redirect: 'follow', signal: ac.signal });
        if (r.status >= 400) { res.status(r.status === 416 ? 416 : 502).end(); try { r.body && r.body.cancel(); } catch {} return; }
        const cr = /\/(\d+)$/.exec(r.headers.get('content-range') || '');
        const cl = +(r.headers.get('content-length') || 0);
        const type = mimeFor(r.headers.get('content-type') || '', u);
        let size = 0, ranges = false;
        if (r.status === 206 && cr) { size = +cr[1]; ranges = true; } else if (r.status === 200) size = cl;
        if (size) metaCache.set(key, { size, ranges, type, final: r.url || u, t: Date.now() });
        res.set({ 'Content-Type': type, 'Cache-Control': 'no-cache' });
        if (size) {
          // known size: always answer in the player's own language (206 for a ranged request) so the whole timeline is seekable
          const req0 = parseRange(req.headers.range, size) || { start: 0, end: size - 1 };
          if (r.status === 206 && ranges) {
            res.status(206).set({ 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${req0.start}-${req0.end}/${size}`, 'Content-Length': String(req0.end - req0.start + 1) });
            res.flushHeaders();
            await streamRange(u, headers, req0.start, req0.end, res, ac, r);
            return res.end();
          }
          // host ignored the range (200): the body is the whole file starting at byte 0
          res.status(wantsRange ? 206 : 200).set({ 'Accept-Ranges': 'bytes', 'Content-Length': String(req0.end - req0.start + 1) });
          if (wantsRange) res.set('Content-Range', `bytes ${req0.start}-${req0.end}/${size}`);
          res.flushHeaders();
          const reader = r.body.getReader();
          let pos = 0;
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            let buf = Buffer.from(value.buffer, value.byteOffset, value.length);
            if (pos + buf.length - 1 > req0.end) buf = buf.subarray(0, req0.end - pos + 1);
            pos += buf.length;
            if (!res.write(buf)) await waitDrain(res);
            if (res.destroyed || pos > req0.end) { try { reader.cancel(); } catch {} break; }
          }
          return res.end();
        }
        // size unknown (live or chunked): pass it through as it comes
        res.status(r.status === 206 ? 200 : r.status);
        res.flushHeaders();
        const reader = r.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!res.write(Buffer.from(value.buffer, value.byteOffset, value.length))) await waitDrain(res);
          if (res.destroyed) break;
        }
        return res.end();
      }

      // A jump (or a source we already know): we need the size and whether ranges work.
      meta = meta || await getMeta(u, headers, ac.signal);
      const size = meta.size;
      const rg = parseRange(req.headers.range, size) || (size ? { start: 0, end: size - 1 } : { start: 0, end: Infinity });
      if (size && (rg.start >= size || rg.start > rg.end)) return res.status(416).set('Content-Range', 'bytes */' + size).end();
      const target = meta.final || u;
      const len = size ? rg.end - rg.start + 1 : 0;
      const head = () => {
        res.status(wantsRange ? 206 : 200).set({ 'Content-Type': mimeFor(meta.type, u), 'Accept-Ranges': size ? 'bytes' : 'none', 'Cache-Control': 'no-cache' });
        if (size) res.set('Content-Length', String(len));
        if (wantsRange && size) res.set('Content-Range', `bytes ${rg.start}-${rg.end}/${size}`);
      };
      if (!meta.ranges) {
        if (!size) return res.status(502).send('This host cannot seek');
        res.__begin = () => { head(); res.flushHeaders(); };
        return await streamSkip(u, headers, rg.start, rg.end, res, ac);
      }
      // Large jump: parallel pieces. If any of them fails, carry on from the exact byte with one connection.
      if (size > 48 * 1024 * 1024 && rg.start > 0 && len > 8 * 1024 * 1024 && meta.par !== false) {
        const sent = { n: 0 };
        let began = false;
        try {
          await pump(target, headers, rg.start, rg.end, res, ac.signal, () => { began = true; head(); res.flushHeaders(); }, sent);
          return;
        } catch (e) {
          if (ac.signal.aborted || res.destroyed) return;
          meta.par = false; // this host does not like parallel requests: do not try again
          if (!began) { head(); res.flushHeaders(); }
          await streamRange(target, headers, rg.start + sent.n, rg.end, res, ac);
          return res.end();
        }
      }
      head();
      res.flushHeaders();
      await streamRange(target, headers, rg.start, rg.end, res, ac);
      return res.end();
    } catch (e) {
      if (ac.signal.aborted || e?.name === 'AbortError') return;
      if (!res.headersSent && !res.destroyed) { try { res.status(502).send('Upstream error'); } catch {} }
      else { try { res.destroy(); } catch {} }
    }
  });

  /* ---------------------------------------------------------------- hardware video encoder (only used when a stream must be re-encoded) ---------------------------------------------------------------- */
  // Each encoder is really tried on a tiny test picture, so a name that only exists inside ffmpeg but has no matching graphics card is never chosen.
  let hwReady = null;
  function detectHw() {
    if (hwReady) return hwReady;
    const tests = [
      ['nvenc', ['-c:v', 'h264_nvenc', '-preset', 'p1', '-tune', 'll']],
      ['qsv', ['-c:v', 'h264_qsv', '-preset', 'veryfast']],
      ['amf', ['-c:v', 'h264_amf', '-quality', 'speed']],
    ];
    hwReady = (async () => {
      for (const [name, enc] of tests) {
        const ok = await new Promise((resolve) => {
          execFile(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=black:s=256x144:d=0.2', '-frames:v', '3', ...enc, '-pix_fmt', 'yuv420p', '-f', 'null', '-'], { timeout: 6000, windowsHide: true }, (err) => resolve(!err));
        });
        if (ok) { caps.hw = name; return name; }
      }
      caps.hw = 'none';
      return 'none';
    })();
    return hwReady;
  }
  const encArgs = (hw) => hw === 'nvenc' ? ['-c:v', 'h264_nvenc', '-preset', 'p1', '-tune', 'll', '-cq', '24', '-pix_fmt', 'yuv420p']
    : hw === 'qsv' ? ['-c:v', 'h264_qsv', '-preset', 'veryfast', '-global_quality', '24', '-pix_fmt', 'nv12']
    : hw === 'amf' ? ['-c:v', 'h264_amf', '-quality', 'speed', '-rc', 'cqp', '-qp_i', '24', '-qp_p', '24', '-pix_fmt', 'yuv420p']
    : ['-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency', '-crf', '25', '-pix_fmt', 'yuv420p'];

  /* ---------------------------------------------------------------- conversion to HLS ---------------------------------------------------------------- */
  function probe(u, hs) {
    return new Promise((resolve) => {
      execFile(FFPROBE, ['-v', 'error', '-analyzeduration', '3000000', '-probesize', '5000000', ...(hs ? ['-headers', hs] : []), '-show_entries', 'stream=codec_type,codec_name,pix_fmt', '-of', 'json', u], { timeout: 20000, windowsHide: true }, (err, out) => {
        // JSON, not CSV: ffprobe prints CSV fields in its own order (codec_name before codec_type), which the old parser got wrong
        // and so never found the codec; every stream was re-encoded even when it could simply be copied.
        let streams = [];
        try { streams = JSON.parse(out || '{}').streams || []; } catch {}
        const v = streams.find((s) => s.codec_type === 'video') || {};
        const a = streams.find((s) => s.codec_type === 'audio') || {};
        resolve({ codec: v.codec_name || '', pix: v.pix_fmt || '', acodec: a.codec_name || '' });
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
    const [{ codec, pix, acodec }, hw] = await Promise.all([probe(u, hs), detectHw()]);
    const hevcCopy = caps.hevc && codec === 'hevc' && /^yuv420p(10le)?$/.test(pix);
    const copyVideo = (codec === 'h264' && (pix === 'yuv420p' || pix === '')) || hevcCopy;
    // Copy whenever the player can decode the video as it is (no quality loss, no CPU). Re-encode only when it cannot,
    // with the graphics card if one works, and at the original size (no downscale) in that case.
    const soft = hw === 'none';
    const args = ['-hide_banner', '-loglevel', 'error', '-analyzeduration', '3000000', '-probesize', '6000000',
      '-user_agent', BROWSER_UA,
      ...(copyVideo ? [] : ['-hwaccel', 'auto']),
      ...(hs ? ['-headers', hs] : []),
      '-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5', '-i', u,
      '-map', '0:v:0', '-map', '0:a:0?', '-sn',
      ...(copyVideo ? ['-c:v', 'copy', ...(hevcCopy ? ['-tag:v', 'hvc1'] : [])] : [...encArgs(hw), ...(soft ? ['-vf', "scale='min(1920,iw)':-2"] : [])]),
      ...(acodec === 'aac' ? ['-c:a', 'copy'] : ['-c:a', 'aac', '-ac', '2', '-b:a', '192k']),
      '-f', 'hls', '-hls_time', '4', '-hls_list_size', '0', '-hls_playlist_type', 'event', '-hls_flags', 'independent_segments+temp_file',
      ...(hevcCopy ? ['-hls_segment_type', 'fmp4', '-hls_fmp4_init_filename', 'init.mp4', '-hls_segment_filename', path.join(dir, 'seg%05d.m4s')] : ['-hls_segment_filename', path.join(dir, 'seg%05d.ts')]),
      path.join(dir, 'index.m3u8')];
    const proc = spawn(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    job = { id, dir, proc, last: Date.now(), done: false, err: '', mode: copyVideo ? 'copy' : hw };
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
      for (let i = 0; i < 160; i++) {
        if (fs.existsSync(playlist) && fs.readFileSync(playlist, 'utf8').includes('#EXTINF')) return res.redirect(302, `/hls/${job.id}/index.m3u8`);
        if (job.done) break;
        await sleep(150);
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
    for (const [k, m] of metaCache) if (now - m.t > 900000) metaCache.delete(k);
  }, 60000).unref();

  return new Promise((resolve, reject) => {
    const tryListen = (p) => {
      const s = app.listen(p, '127.0.0.1', () => { app.locals.port = p; detectHw().catch(() => {}); resolve({ port: p, key: KEY, server: s }); });
      s.on('error', (e) => { if (e.code === 'EADDRINUSE' && p < port + 10) tryListen(p + 1); else reject(e); });
    };
    tryListen(port);
  });
}

module.exports = { startServer };
