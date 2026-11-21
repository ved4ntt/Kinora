// Kinora for Windows: frameless full-screen window around the Kinora site with a built-in streaming server.
const { app, BrowserWindow, Menu, shell, ipcMain, screen } = require('electron');
const path = require('path');
const { startServer } = require('./localserver');
let autoUpdater = null;
try { ({ autoUpdater } = require('electron-updater')); } catch {}

// Video engine. "builtin" (default) = Chromium plays the video, exactly as before. "mpv" (beta, Settings > Playback > Video engine) = mpv.exe draws the picture in a
// native window behind a see-through Kinora window. It is only used when it was chosen AND mpv.exe exists, so nothing changes for anyone else.
const mpvMod = require('./mpv');
const MPV_ON = process.platform === 'win32' && mpvMod.readEngine(app) === 'mpv' && !!mpvMod.findMpv(app);

process.on('uncaughtException', (err) => {
  if (err && (err.name === 'AbortError' || err.code === 'ABORT_ERR' || String(err).includes('aborted'))) return;
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  if (reason && (reason.name === 'AbortError' || reason.code === 'ABORT_ERR' || String(reason).includes('aborted'))) return;
  console.error('Unhandled Rejection:', reason);
});

// Hardware decoding: HEVC (H.265, 4K, HDR) and H.264 / VP9 / AV1 are decoded by the graphics card through D3D11 whenever it can,
// so playback uses almost no CPU and 4K plays without re-encoding. The graphics-driver block list is ignored so older cards still get it.
// One call only: Chromium keeps the last value given for a switch, so the feature list is set here and nowhere else.
app.commandLine.appendSwitch('enable-features', 'PlatformHEVCDecoderSupport,D3D11VideoDecoder,MediaFoundationD3D11VideoCapture,CanvasOopRasterization');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
// lets the player list and switch the audio tracks inside a file (dual audio, commentary)
app.commandLine.appendSwitch('enable-blink-features', 'AudioVideoTracks');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

if (!app.requestSingleInstanceLock()) app.quit();

// Google sign-in returns to the app through kinora://auth (the browser hands the link back to Kinora).
const PROTO = 'kinora';
if (process.defaultApp) {
  if (process.argv.length >= 2) app.setAsDefaultProtocolClient(PROTO, process.execPath, [path.resolve(process.argv[1])]);
} else {
  app.setAsDefaultProtocolClient(PROTO);
}
const authUrl = (argv) => (argv || []).find((a) => /^kinora:\/\/auth/i.test(a));
let pendingAuth = authUrl(process.argv);
function sendAuth(u) {
  if (!u) return;
  if (win && !win.isDestroyed() && !win.webContents.isLoading()) {
    win.webContents.send('auth-url', u);
    if (win.isMinimized()) win.restore();
    win.focus();
  } else pendingAuth = u;
}

let win;
let stopJobs = null;
let lastNav = 0;

// ---- mpv mode only: the black window mpv draws into, kept exactly behind the Kinora window ----
// A transparent window cannot be maximised or made full screen by Windows itself, so in this mode both are done by setting the bounds.
let videoWin = null, videoShown = false, isMax = false, isFull = false, restoreBounds = null, mpvCtl = null;
const workArea = () => screen.getDisplayMatching(win.getBounds()).workArea;
function followVideo() { if (videoShown && videoWin && !videoWin.isDestroyed() && win) { try { videoWin.setBounds(win.getBounds()); } catch {} } }
function raiseVideo() {
  if (!videoShown || !videoWin || videoWin.isDestroyed() || !win || win.isDestroyed()) return;
  try { videoWin.setBounds(win.getBounds()); videoWin.setAlwaysOnTop(win.isAlwaysOnTop(), 'screen-saver'); videoWin.showInactive(); win.moveTop(); } catch {}
}
function showVideo() { videoShown = true; raiseVideo(); }
function hideVideo() { videoShown = false; try { if (videoWin && !videoWin.isDestroyed()) videoWin.hide(); } catch {} }
function setMax(on) {
  if (!win) return;
  if (on) { if (!isFull) restoreBounds = win.getBounds(); win.setBounds(workArea()); isMax = true; }
  else { if (restoreBounds) win.setBounds(restoreBounds); isMax = false; }
  followVideo(); win.webContents.send('win-state', { max: isMax, full: isFull });
}
function setFull(on) {
  if (!win || on === isFull) return;
  isFull = on;
  if (on) { if (!isMax) restoreBounds = win.getBounds(); win.setBounds(screen.getDisplayMatching(win.getBounds()).bounds); win.setAlwaysOnTop(true, 'screen-saver'); }
  else { win.setAlwaysOnTop(false); win.setBounds(isMax ? workArea() : (restoreBounds || win.getBounds())); }
  followVideo(); raiseVideo(); win.webContents.send('win-state', { max: isMax, full: isFull });
}
// One place for "go back / forward" so the mouse side buttons never fire twice.
function nav(dir) {
  if (!win) return;
  const now = Date.now();
  if (now - lastNav < 250) return;
  lastNav = now;
  const wc = win.webContents;
  if (dir === 'back' && wc.canGoBack()) wc.goBack();
  if (dir === 'forward' && wc.canGoForward()) wc.goForward();
}

async function createWindow() {
  const srvInfo = await startServer({
    www: path.join(__dirname, '..', 'www'),
    tmp: path.join(app.getPath('userData'), 'cache'),
  });
  const { port } = srvInfo; stopJobs = srvInfo.killAll;
  Menu.setApplicationMenu(null);
  if (MPV_ON) {
    videoWin = new BrowserWindow({ show: false, frame: false, skipTaskbar: true, focusable: false, hasShadow: false, backgroundColor: '#000000', title: 'Kinora video', webPreferences: { backgroundThrottling: false } });
    videoWin.setIgnoreMouseEvents(true);
    videoWin.loadURL('about:blank');
  }
  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 480, minHeight: 600,
    frame: false, show: false, transparent: MPV_ON, backgroundColor: MPV_ON ? '#00000000' : '#07080b', title: 'Kinora',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, webSecurity: false, backgroundThrottling: false, preload: path.join(__dirname, 'preload.js') },
  });
  if (MPV_ON) {
    ['move', 'resize'].forEach((ev) => win.on(ev, followVideo));
    ['focus', 'restore', 'show'].forEach((ev) => win.on(ev, raiseVideo));
    win.on('minimize', () => { try { videoWin && !videoWin.isDestroyed() && videoWin.hide(); } catch {} });
    win.on('closed', () => { try { videoWin && !videoWin.isDestroyed() && videoWin.destroy(); } catch {} });
  }
  win.once('ready-to-show', () => { if (MPV_ON) setMax(true); else win.maximize(); win.show(); if (MPV_ON) setTimeout(() => { try { mpvCtl && mpvCtl.warm(); } catch {} }, 2500); });
  win.loadURL(`http://127.0.0.1:${port}/index.html`);
  win.webContents.once('did-finish-load', () => { if (pendingAuth) { const u = pendingAuth; pendingAuth = null; setTimeout(() => sendAuth(u), 1200); } });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:\/\//i.test(url)) shell.openExternal(url); return { action: 'deny' }; });

  // Mouse side buttons (Windows sends them as app commands) and Alt+Left / Alt+Right.
  win.on('app-command', (e, cmd) => {
    if (cmd === 'browser-backward') nav('back');
    if (cmd === 'browser-forward') nav('forward');
  });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.alt && input.key === 'ArrowLeft') { e.preventDefault(); nav('back'); }
    if (input.type === 'keyDown' && input.alt && input.key === 'ArrowRight') { e.preventDefault(); nav('forward'); }
  });

  const st = () => win.webContents.send('win-state', MPV_ON ? { max: isMax, full: isFull } : { max: win.isMaximized(), full: win.isFullScreen() });
  ['maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen'].forEach((ev) => win.on(ev, st));
}

ipcMain.on('win', (_e, a) => {
  if (!win) return;
  if (a === 'min') win.minimize();
  else if (a === 'max') { if (MPV_ON) setMax(!isMax); else win.isMaximized() ? win.unmaximize() : win.maximize(); }
  else if (a === 'full') { if (MPV_ON) setFull(!isFull); else win.setFullScreen(!win.isFullScreen()); }
  // the player asks for full screen by itself while a video plays, and gives it back when you leave the player
  else if (a === 'fs-on') { if (MPV_ON) setFull(true); else if (!win.isFullScreen()) win.setFullScreen(true); }
  else if (a === 'fs-off') { if (MPV_ON) setFull(false); else if (win.isFullScreen()) win.setFullScreen(false); }
  else if (a === 'quit') app.quit();
  else if (a === 'back') nav('back');
  else if (a === 'forward') nav('forward');
});

// What this PC can really do for video: the graphics driver's own report (hardware decoding on or off) and the card in use.
ipcMain.handle('sys:caps', async () => {
  const out = { gpu: {}, devices: [] };
  try { out.gpu = app.getGPUFeatureStatus() || {}; } catch {}
  try {
    const i = await app.getGPUInfo('basic');
    out.devices = ((i && i.gpuDevice) || []).slice(0, 3).map((d) => ({ vendor: d.vendorId, device: d.deviceId, active: !!d.active, driver: String(d.driverVersion || '') }));
  } catch {}
  return out;
});

// Conversions started by the built-in server must not outlive the app (they would keep downloading in the background).
app.on('before-quit', () => { try { stopJobs && stopJobs(); } catch {} try { mpvCtl && mpvCtl.quit(); } catch {} });

ipcMain.on('open-external', (_e, u) => { if (typeof u === 'string' && /^https:\/\//i.test(u)) shell.openExternal(u); });

// mpv engine: info, engine switch, load / control (see mpv.js). Registered always, so the page can ask whether the engine exists; it only acts when MPV_ON.
mpvCtl = mpvMod.register({ ipcMain, app, getWin: () => win, getVideoWin: () => videoWin, running: MPV_ON, show: showVideo, hide: hideVideo });

// Smooth playback: hand a stream to mpv or VLC when one is installed (Windows)
const { spawn, execFileSync } = require('child_process');
const fsx = require('fs');
let extFound;
function findPlayer() {
  if (extFound !== undefined) return extFound;
  const pf = process.env['ProgramFiles'] || 'C:\\Program Files', pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', la = process.env.LOCALAPPDATA || '', home = process.env.USERPROFILE || '';
  const mpv = [path.join(pf, 'mpv', 'mpv.exe'), path.join(pf86, 'mpv', 'mpv.exe'), path.join(la, 'Programs', 'mpv', 'mpv.exe'), path.join(home, 'scoop', 'apps', 'mpv', 'current', 'mpv.exe'), 'C:\\ProgramData\\chocolatey\\bin\\mpv.exe'];
  const vlc = [path.join(pf, 'VideoLAN', 'VLC', 'vlc.exe'), path.join(pf86, 'VideoLAN', 'VLC', 'vlc.exe')];
  let hit = mpv.find((p) => fsx.existsSync(p));
  if (hit) return (extFound = { kind: 'mpv', exe: hit });
  try { const w = execFileSync('where', ['mpv'], { encoding: 'utf8', timeout: 2500 }).split(/\r?\n/)[0].trim(); if (w && fsx.existsSync(w)) return (extFound = { kind: 'mpv', exe: w }); } catch {}
  hit = vlc.find((p) => fsx.existsSync(p));
  return (extFound = hit ? { kind: 'vlc', exe: hit } : null);
}
// every installed player, in the order mpv, VLC, PotPlayer (the page decides if and which one to use; the default is none)
let extAll;
function listPlayers() {
  if (extAll) return extAll;
  const pf = process.env['ProgramFiles'] || 'C:\\Program Files', pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', la = process.env.LOCALAPPDATA || '';
  const out = [], first = findPlayer();
  const vlcExe = [path.join(pf, 'VideoLAN', 'VLC', 'vlc.exe'), path.join(pf86, 'VideoLAN', 'VLC', 'vlc.exe')].find((p) => fsx.existsSync(p));
  const potExe = [path.join(pf, 'DAUM', 'PotPlayer', 'PotPlayerMini64.exe'), path.join(pf, 'PotPlayer', 'PotPlayerMini64.exe'), path.join(la, 'Programs', 'PotPlayer', 'PotPlayerMini64.exe'), path.join(pf86, 'DAUM', 'PotPlayer', 'PotPlayerMini.exe'), path.join(pf86, 'PotPlayer', 'PotPlayerMini.exe'), path.join(pf, 'DAUM', 'PotPlayer', 'PotPlayerMini.exe')].find((p) => fsx.existsSync(p));
  if (first && first.kind === 'mpv') out.push(first);
  if (vlcExe) out.push({ kind: 'vlc', exe: vlcExe }); else if (first && first.kind === 'vlc') out.push(first);
  if (potExe) out.push({ kind: 'pot', exe: potExe });
  return (extAll = out);
}
const pickPlayer = (prefer) => { const a = listPlayers(); return a.find((p) => p.kind === prefer) || a[0] || null; };
ipcMain.handle('ext:info', () => { const a = listPlayers(); return a.length ? { kind: a[0].kind, all: a.map((p) => p.kind) } : null; });
ipcMain.handle('ext:play', (_e, o) => {
  const p = pickPlayer(o && o.prefer);
  if (!p || !o || typeof o.url !== 'string' || !/^https?:\/\//i.test(o.url)) return { ok: false };
  const h = o.headers && typeof o.headers === 'object' ? o.headers : {};
  const ua = h['User-Agent'] || h['user-agent'] || '', ref = h['Referer'] || h['referer'] || '';
  const start = Math.max(0, Math.floor(+o.start || 0));
  let args;
  if (p.kind === 'pot') {
    args = [o.url, '/new'];
    if (start) args.push('/seek=' + new Date(start * 1000).toISOString().substr(11, 8));
  } else if (p.kind === 'mpv') {
    args = ['--fullscreen', '--force-window=yes', '--hwdec=auto-safe', '--cache=yes', '--demuxer-max-bytes=300MiB', '--title=' + String(o.title || 'Kinora').slice(0, 120)];
    if (start) args.push('--start=' + start);
    if (ua) args.push('--user-agent=' + ua);
    if (ref) args.push('--referrer=' + ref);
    args.push(o.url);
  } else {
    args = ['--fullscreen', '--play-and-exit', '--no-video-title-show', '--file-caching=3000', '--network-caching=5000'];
    if (start) args.push('--start-time=' + start);
    if (ua) args.push('--http-user-agent=' + ua);
    if (ref) args.push('--http-referrer=' + ref);
    args.push(o.url);
  }
  try { const c = spawn(p.exe, args, { detached: true, stdio: 'ignore' }); c.on('error', () => {}); c.unref(); return { ok: true, player: p.kind }; } catch { return { ok: false }; }
});

// (hardware video flags are set once, at the top of this file)


// Updates: Windows reads GitHub Releases through electron-updater. The page decides when to check and download.
const upd = (s) => { if (win && !win.isDestroyed()) win.webContents.send('upd:event', s); };
if (autoUpdater) {
  autoUpdater.autoDownload = false;
  autoUpdater.allowPrerelease = true;
  autoUpdater.autoInstallOnAppQuit = true;
  const noteText = (n) => (typeof n === 'string' ? n : Array.isArray(n) ? n.map((x) => (x && x.note) || '').filter(Boolean).join('\n\n') : '');
  const mb = (b) => (b / 1048576).toFixed(b > 1e8 ? 0 : 1);
  autoUpdater.on('update-available', (i) => upd({ s: 'available', v: i.version, notes: noteText(i.releaseNotes) }));
  autoUpdater.on('update-not-available', () => upd({ s: 'uptodate' }));
  // the page shows "12 of 85 MB \u00b7 4.1 MB/s" under the bar
  autoUpdater.on('download-progress', (p) => upd({ s: 'downloading', p: Math.round(p.percent), m: mb(p.transferred) + ' of ' + mb(p.total) + ' MB \u00b7 ' + (p.bytesPerSecond / 1048576).toFixed(1) + ' MB/s' }));
  autoUpdater.on('update-downloaded', (i) => upd({ s: 'ready', v: i.version, m: 'Installs when you close Kinora, or now with Restart.' }));
  autoUpdater.on('error', (e) => upd({ s: 'error', m: 'Could not update: ' + String((e && e.message) || e).split('\n')[0].slice(0, 110) }));
}
ipcMain.handle('upd:version', () => app.getVersion());
ipcMain.handle('upd:check', async () => { if (!autoUpdater || !app.isPackaged) return upd({ s: 'uptodate' }); try { await autoUpdater.checkForUpdates(); } catch {} });
ipcMain.handle('upd:download', async () => { try { await autoUpdater.downloadUpdate(); } catch {} });
ipcMain.on('upd:install', () => { if (autoUpdater) autoUpdater.quitAndInstall(true, true); }); // silent install, then Kinora starts again by itself

app.whenReady().then(createWindow);
app.on('second-instance', (_e, argv) => { const u = authUrl(argv); if (win) { if (win.isMinimized()) win.restore(); win.focus(); } if (u) sendAuth(u); });
app.on('window-all-closed', () => app.quit());
