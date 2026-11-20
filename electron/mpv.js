// mpv engine for the Windows app (beta).
//
// How it fits together:
//  - main.js creates a plain black "video" window and puts it directly behind the (transparent) Kinora window. mpv.exe is started with --wid pointing at
//    that window, so mpv draws the picture there with its own GPU pipeline (hardware decoding, FFmpeg demuxing, HDR passthrough when Windows HDR is on).
//  - The page (kmpv.js) sees the usual playback state through the shared Backend contract in kcore.js: {s,pw,p,d,b,e,a,t,vf,af}.
//  - mpv is controlled over its JSON IPC (a named pipe). Nothing here transcodes: mpv plays the file as it is.
//  - Everything fails soft: if mpv is missing or cannot start, "mpv:load" answers { ok:false } and the page falls back to the built-in engine.
//
// This module is only required when the engine switch (Settings > Playback > Video engine) is set to mpv, so it cannot affect the default build.
const { spawn, execFileSync } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/* ------------------------------------------------------------------ engine choice, stored next to the other app data (read before the window exists) */
const flagFile = (app) => path.join(app.getPath('userData'), 'kinora-engine.json');
function readEngine(app) {
  try { const j = JSON.parse(fs.readFileSync(flagFile(app), 'utf8')); return j && j.engine === 'mpv' ? 'mpv' : 'builtin'; } catch { return 'builtin'; }
}
function writeEngine(app, engine) {
  try { fs.writeFileSync(flagFile(app), JSON.stringify({ engine: engine === 'mpv' ? 'mpv' : 'builtin' })); return true; } catch { return false; }
}

/* ------------------------------------------------------------------ where is mpv.exe: bundled with the app first, then an install on this PC */
function findMpv(app) {
  const c = [];
  if (process.resourcesPath) c.push([path.join(process.resourcesPath, 'mpv', 'mpv.exe'), 'bundled']);
  c.push([path.join(__dirname, '..', 'build', 'mpv', 'mpv.exe'), 'bundled']);
  const pf = process.env['ProgramFiles'] || 'C:\\Program Files', pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', la = process.env.LOCALAPPDATA || '', home = process.env.USERPROFILE || '';
  [path.join(pf, 'mpv', 'mpv.exe'), path.join(pf86, 'mpv', 'mpv.exe'), path.join(la, 'Programs', 'mpv', 'mpv.exe'), path.join(home, 'scoop', 'apps', 'mpv', 'current', 'mpv.exe'), 'C:\\ProgramData\\chocolatey\\bin\\mpv.exe'].forEach((p) => c.push([p, 'installed']));
  for (const [p, where] of c) { try { if (fs.existsSync(p)) return { exe: p, where }; } catch {} }
  try { const w = execFileSync('where', ['mpv'], { encoding: 'utf8', timeout: 2500, windowsHide: true }).split(/\r?\n/)[0].trim(); if (w && fs.existsSync(w)) return { exe: w, where: 'installed' }; } catch {}
  return null;
}

/* ------------------------------------------------------------------ names */
const LN = { eng: 'English', hin: 'Hindi', tam: 'Tamil', tel: 'Telugu', mal: 'Malayalam', kan: 'Kannada', ben: 'Bengali', mar: 'Marathi', pan: 'Punjabi', guj: 'Gujarati', urd: 'Urdu', spa: 'Spanish', fre: 'French', fra: 'French', ger: 'German', deu: 'German', ita: 'Italian', jpn: 'Japanese', kor: 'Korean', rus: 'Russian', por: 'Portuguese', chi: 'Chinese', zho: 'Chinese', ara: 'Arabic', tur: 'Turkish', tha: 'Thai', vie: 'Vietnamese', ind: 'Indonesian', pol: 'Polish' };
const AN = { ac3: 'AC-3', eac3: 'E-AC-3', truehd: 'TrueHD', dts: 'DTS', aac: 'AAC', opus: 'Opus', flac: 'FLAC', mp3: 'MP3', vorbis: 'Vorbis', pcm_s16le: 'PCM', pcm_s24le: 'PCM' };
const LANGCODES = { Hindi: 'hin,hi', English: 'eng,en', Tamil: 'tam,ta', Telugu: 'tel,te', Malayalam: 'mal,ml', Kannada: 'kan,kn', Bengali: 'ben,bn', Marathi: 'mar,mr', Spanish: 'spa,es', French: 'fre,fra,fr', German: 'ger,deu,de', Italian: 'ita,it', Japanese: 'jpn,ja', Korean: 'kor,ko', Russian: 'rus,ru', Portuguese: 'por,pt', Chinese: 'chi,zho,zh' };
const chName = (n) => (n === 6 ? ' 5.1' : n === 8 ? ' 7.1' : n > 2 ? ' ' + n + 'ch' : '');
const trackName = (t, i, kind) => {
  const lang = LN[String(t.lang || '').toLowerCase()] || (t.lang && t.lang !== 'und' ? String(t.lang).toUpperCase() : '');
  const base = t.title ? String(t.title) : lang || (kind === 'audio' ? 'Track ' : 'Subtitles ') + (i + 1);
  if (kind !== 'audio') return t.title && lang && !t.title.includes(lang) ? lang + ' \u00b7 ' + t.title : base;
  const codec = AN[String(t.codec || '').toLowerCase()] || '';
  return base + (codec ? ' \u00b7 ' + codec + chName(+t['demux-channel-count'] || 0) : '');
};

/* ------------------------------------------------------------------ the controller: one mpv process, kept alive between videos */
class Mpv {
  constructor({ app, getVideoWin, send, onShow, onHide }) {
    Object.assign(this, { app, getVideoWin, send, onShow, onHide });
    this.found = findMpv(app);
    this.proc = null; this.sock = null; this.buf = ''; this.rid = 0; this.wait = new Map();
    this.starting = null; this.vo = 'gpu-next'; this.stderr = '';
    this.reset();
  }
  reset() { this.P = {}; this.loaded = false; this.loading = false; this.err = ''; this.logs = []; this.aids = []; this.sids = []; this.a = []; this.t = []; this.lastJson = ''; }
  get ready() { return !!(this.found && this.getVideoWin()); }

  /* ---- process ---- */
  hwnd() {
    const vw = this.getVideoWin(); if (!vw || vw.isDestroyed()) return '';
    const b = vw.getNativeWindowHandle();
    return b.length >= 8 ? b.readBigUInt64LE(0).toString() : String(b.readUInt32LE(0));
  }
  ensure() {
    if (this.sock && !this.sock.destroyed) return Promise.resolve(true);
    if (this.starting) return this.starting;
    this.starting = this.spawnAndConnect().finally(() => { this.starting = null; });
    return this.starting;
  }
  async spawnAndConnect() {
    if (!this.found) { this.err = 'mpv.exe was not found'; return false; }
    for (const vo of [this.vo, 'gpu']) {
      const ok = await this.tryStart(vo);
      if (ok) { this.vo = vo; return true; }
      this.killProc();
    }
    return false;
  }
  async tryStart(vo) {
    const wid = this.hwnd(); if (!wid) { this.err = 'video window missing'; return false; }
    const pipe = '\\\\.\\pipe\\kinora-mpv-' + process.pid + '-' + crypto.randomBytes(3).toString('hex');
    const args = ['--config=no', '--load-scripts=no', '--idle=yes', '--force-window=yes', '--no-terminal', '--no-osc', '--osd-level=0', '--input-default-bindings=no', '--input-vo-keyboard=no',
      '--cursor-autohide=no', '--keep-open=yes', '--ytdl=no', '--save-position-on-quit=no', '--sid=no', '--sub-auto=no', '--audio-display=no',
      '--wid=' + wid, '--input-ipc-server=' + pipe, '--vo=' + vo, '--hwdec=auto-safe',
      // network and buffering: reconnect on a dropped connection, bounded cache, old data behind the playhead is dropped
      '--network-timeout=20', '--stream-lavf-o=reconnect=1,reconnect_streamed=1,reconnect_delay_max=5,multiple_requests=1', '--cache=yes', '--demuxer-max-bytes=300MiB', '--demuxer-max-back-bytes=96MiB', '--demuxer-readahead-secs=120'];
    this.stderr = '';
    let exited = false;
    const p = spawn(this.found.exe, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    this.proc = p;
    p.stderr.on('data', (d) => { this.stderr = (this.stderr + d).slice(-600); });
    p.on('error', (e) => { exited = true; this.err = String(e && e.message || e); });
    p.on('exit', () => { exited = true; if (this.proc === p) { this.proc = null; this.dropSock(); if (this.loaded || this.loading) { this.err = 'mpv stopped unexpectedly'; this.loading = false; this.loaded = false; this.emit(true); } } });
    const t0 = Date.now();
    while (Date.now() - t0 < 6000 && !exited) {
      const s = await this.connect(pipe);
      if (s) { this.attach(s); await this.setup(); return true; }
      await sleep(120);
    }
    if (!this.err) this.err = 'mpv did not start' + (this.stderr ? ': ' + this.stderr.split(/\r?\n/).filter(Boolean).pop() : '');
    return false;
  }
  connect(pipe) {
    return new Promise((res) => {
      const s = net.createConnection(pipe);
      s.once('connect', () => res(s));
      s.once('error', () => { try { s.destroy(); } catch {} res(null); });
    });
  }
  attach(s) {
    this.sock = s; this.buf = '';
    s.on('data', (d) => { this.buf += d; let i; while ((i = this.buf.indexOf('\n')) >= 0) { const line = this.buf.slice(0, i); this.buf = this.buf.slice(i + 1); if (line.trim()) { try { this.onMsg(JSON.parse(line)); } catch {} } } });
    s.on('close', () => this.dropSock());
    s.on('error', () => this.dropSock());
  }
  dropSock() { try { this.sock && this.sock.destroy(); } catch {} this.sock = null; for (const [, w] of this.wait) w({ error: 'closed' }); this.wait.clear(); }
  killProc() { const p = this.proc; this.proc = null; this.dropSock(); try { p && p.kill(); } catch {} }
  quit() { try { this.cmd(['quit']); } catch {} setTimeout(() => this.killProc(), 300); clearInterval(this.tick); }

  /* ---- protocol ---- */
  cmd(args) {
    return new Promise((res) => {
      if (!this.sock || this.sock.destroyed) return res({ error: 'not connected' });
      const id = ++this.rid;
      const to = setTimeout(() => { this.wait.delete(id); res({ error: 'timeout' }); }, 5000);
      this.wait.set(id, (m) => { clearTimeout(to); res(m); });
      try { this.sock.write(JSON.stringify({ command: args, request_id: id }) + '\n'); } catch { clearTimeout(to); this.wait.delete(id); res({ error: 'write failed' }); }
    });
  }
  set(name, value) { return this.cmd(['set_property', name, value]); }
  async setup() {
    const OBS = ['time-pos', 'duration', 'pause', 'paused-for-cache', 'core-idle', 'idle-active', 'demuxer-cache-time', 'eof-reached', 'seekable', 'track-list', 'video-params', 'audio-params', 'video-format', 'audio-codec-name', 'hwdec-current', 'volume', 'speed'];
    let n = 1; for (const p of OBS) await this.cmd(['observe_property', n++, p]);
    await this.cmd(['request_log_messages', 'warn']);
    // useful when they exist, harmless when this mpv build does not know them
    await this.set('target-colorspace-hint', 'yes');
    await this.set('hdr-compute-peak', 'yes');
    clearInterval(this.tick); this.tick = setInterval(() => this.emit(false), 250);
  }
  onMsg(m) {
    if (m.request_id != null && this.wait.has(m.request_id)) { const w = this.wait.get(m.request_id); this.wait.delete(m.request_id); w(m); return; }
    if (m.event === 'property-change') { this.P[m.name] = m.data; if (m.name === 'track-list') this.tracks(m.data); return; }
    if (m.event === 'file-loaded') { this.loaded = true; this.loading = false; if (this.wantStart > 1 && !(this.P['time-pos'] > this.wantStart - 2)) this.cmd(['seek', this.wantStart, 'absolute']); return; }
    if (m.event === 'log-message') { if (m.level === 'error' || m.level === 'warn') this.logs = this.logs.concat(String(m.text || '').trim()).slice(-8); return; }
    if (m.event === 'end-file') {
      if (m.reason === 'error') { this.err = this.explain(m.file_error); this.loaded = false; this.loading = false; this.emit(true); }
      else if (m.reason === 'eof') this.P['eof-reached'] = true;
    }
  }
  explain(fileError) {
    const all = this.logs.join(' | ');
    const http = /(?:HTTP error|Server returned)\s+(\d{3})/i.exec(all);
    if (http) {
      const c = +http[1];
      return c === 403 || c === 401 ? 'the host refused the request (HTTP ' + c + '): the link may have expired or needs other headers'
        : c === 404 || c === 410 ? 'the file is gone on the host (HTTP ' + c + ')'
        : c === 429 ? 'the host is limiting requests (HTTP 429): try again in a minute'
        : c >= 500 ? 'the host has a problem (HTTP ' + c + ')' : 'the host answered HTTP ' + c;
    }
    if (/unrecognized file format|Invalid data found/i.test(all + ' ' + fileError)) return 'unrecognized file format: the link is not a video file';
    if (/unsupported|not supported/i.test(fileError || '')) return 'unsupported format';
    if (/Connection (timed out|refused|reset)|timed out|Failed to resolve|Name or service/i.test(all)) return 'could not reach the host (connection problem)';
    return 'could not open this link' + (fileError ? ' (' + fileError + ')' : '');
  }
  tracks(list) {
    const A = [], T = []; this.aids = []; this.sids = [];
    (Array.isArray(list) ? list : []).forEach((t) => {
      if (t.type === 'audio') { this.aids.push(t.id); A.push({ n: trackName(t, A.length, 'audio'), on: !!t.selected }); }
      else if (t.type === 'sub') { this.sids.push(t.id); T.push({ n: trackName(t, T.length, 'sub'), on: !!t.selected }); }
    });
    this.a = A; this.t = T;
  }

  /* ---- what the page sees ---- */
  snap() {
    const P = this.P, ms = (x) => (typeof x === 'number' && isFinite(x) ? Math.max(0, Math.round(x * 1000)) : 0);
    let s = 1;
    if (this.loading) s = 2;
    else if (this.loaded) { s = 3; if (P['eof-reached']) s = 4; else if (P['paused-for-cache'] || (P['core-idle'] && !P.pause)) s = 2; }
    const vp = P['video-params'] || {}, ap = P['audio-params'] || {};
    const pf = String(vp.pixelformat || ''), bm = /p0?(10|12|16)/.exec(pf), bits = bm ? +bm[1] : 8;
    const o = {
      s, pw: P.pause === false, p: ms(P['time-pos']), d: ms(P.duration), b: ms(P['demuxer-cache-time']), e: this.err, a: this.a, t: this.t, ns: false, eng: 'mpv',
      vf: { w: vp.w || 0, h: vp.h || 0, codec: P['video-format'] || '', bits, hdr: vp.gamma === 'pq' ? 'pq' : vp.gamma === 'hlg' ? 'hlg' : '', hw: P['hwdec-current'] || '' },
      af: { codec: P['audio-codec-name'] || '', ch: ap['channel-count'] || 0 },
    };
    return o;
  }
  emit(force) {
    const j = JSON.stringify(this.snap());
    if (force || j !== this.lastJson) { this.lastJson = j; try { this.send('mpv:state', j); } catch {} }
  }

  /* ---- actions ---- */
  async load(o) {
    if (!this.ready) return { ok: false, error: this.found ? 'video window missing' : 'mpv.exe was not found' };
    if (!(await this.ensure())) return { ok: false, error: this.err || 'mpv could not start' };
    this.reset(); this.P.pause = false; this.loading = true; this.wantStart = +o.start || 0;
    try { this.onShow(); } catch {}
    const hd = o.headers && typeof o.headers === 'object' ? o.headers : {};
    const fields = []; let ua = '', ref = '';
    for (const k of Object.keys(hd)) {
      const v = String(hd[k]); if (!v) continue;
      if (/^user-agent$/i.test(k)) ua = v; else if (/^referer$/i.test(k)) ref = v; else fields.push(k + ': ' + v);
    }
    await this.set('http-header-fields', fields);
    await this.set('user-agent', ua || BROWSER_UA);
    await this.set('referrer', ref);
    await this.set('start', String(this.wantStart > 0 ? this.wantStart : 0));
    await this.set('speed', +o.rate > 0 ? +o.rate : 1);
    await this.set('volume', Math.round(Math.max(0, Math.min(1.3, o.volume == null ? 1 : +o.volume)) * 100));
    await this.set('alang', LANGCODES[o.lang] || '');
    await this.set('sid', 'no');
    await this.set('pause', false);
    const r = await this.cmd(['loadfile', String(o.url), 'replace']);
    if (r.error && r.error !== 'success') { this.err = 'mpv refused the command: ' + r.error; this.loading = false; this.emit(true); return { ok: false, error: this.err }; }
    this.emit(true);
    return { ok: true };
  }
  act(c, v) {
    switch (c) {
      case 'play': return this.set('pause', false);
      case 'pause': return this.set('pause', true);
      case 'seek': return this.cmd(['seek', +v || 0, 'absolute']);
      case 'rate': return this.set('speed', +v > 0 ? +v : 1);
      case 'volume': return this.set('volume', Math.round(Math.max(0, Math.min(1.3, +v)) * 100));
      case 'audio': return this.aids[v] != null ? this.set('aid', this.aids[v]) : null;
      case 'text': return v < 0 || this.sids[v] == null ? this.set('sid', 'no') : this.set('sid', this.sids[v]);
      default: return null;
    }
  }
  async stop() { this.reset(); try { await this.cmd(['stop']); } catch {} try { this.onHide(); } catch {} this.emit(true); }
}

/* ------------------------------------------------------------------ IPC for main.js */
function register({ ipcMain, app, getWin, getVideoWin, running, show, hide }) {
  const send = (ch, d) => { const w = getWin(); if (w && !w.isDestroyed()) w.webContents.send(ch, d); };
  let mpv = null;
  const get = () => (mpv || (mpv = new Mpv({ app, getVideoWin, send, onShow: show, onHide: hide })));
  ipcMain.handle('mpv:info', () => { const m = get(); return { enabled: !!running, ready: !!(running && m.ready), where: m.found ? m.found.where : '' }; });
  ipcMain.handle('mpv:engine', () => { const m = get(); return { engine: running ? 'mpv' : 'builtin', pending: readEngine(app), mpv: !!m.found, where: m.found ? (m.found.where === 'bundled' ? 'bundled with Kinora' : 'installed on this PC') : '' }; });
  ipcMain.handle('mpv:setEngine', (_e, name) => ({ ok: writeEngine(app, name) }));
  ipcMain.on('mpv:relaunch', () => { app.relaunch(); app.exit(0); });
  ipcMain.handle('mpv:load', (_e, o) => { if (!running || !o || typeof o.url !== 'string' || !/^https?:\/\//i.test(o.url)) return { ok: false, error: 'engine is off' }; return get().load(o).catch((e) => ({ ok: false, error: String(e && e.message || e) })); });
  ipcMain.on('mpv:cmd', (_e, o) => { if (running && mpv && o) { try { mpv.act(o.c, o.v); } catch {} } });
  ipcMain.handle('mpv:stop', async () => { if (running && mpv) await mpv.stop(); return true; });
  return { quit: () => { try { mpv && mpv.quit(); } catch {} }, /* start mpv in the background a few seconds after launch so the first video does not pay for it */ warm: () => { try { if (running) { const m = get(); if (m.ready) m.ensure().catch(() => {}); } } catch {} } };
}

module.exports = { readEngine, writeEngine, findMpv, register };
