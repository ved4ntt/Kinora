// Kinora for Windows: frameless full-screen window around the Kinora site with a built-in streaming server.
const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const { startServer } = require('./localserver');

app.commandLine.appendSwitch('enable-features', 'PlatformHEVCDecoderSupport');
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
let lastNav = 0;
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
  const { port } = await startServer({
    www: path.join(__dirname, '..', 'www'),
    tmp: path.join(app.getPath('userData'), 'cache'),
  });
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 480, minHeight: 600,
    frame: false, show: false, backgroundColor: '#07080b', title: 'Kinora',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, webSecurity: false, preload: path.join(__dirname, 'preload.js') },
  });
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
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

  const st = () => win.webContents.send('win-state', { max: win.isMaximized(), full: win.isFullScreen() });
  ['maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen'].forEach((ev) => win.on(ev, st));
}

ipcMain.on('win', (_e, a) => {
  if (!win) return;
  if (a === 'min') win.minimize();
  else if (a === 'max') win.isMaximized() ? win.unmaximize() : win.maximize();
  else if (a === 'full') win.setFullScreen(!win.isFullScreen());
  else if (a === 'quit') app.quit();
  else if (a === 'back') nav('back');
  else if (a === 'forward') nav('forward');
});

ipcMain.on('open-external', (_e, u) => { if (typeof u === 'string' && /^https:\/\//i.test(u)) shell.openExternal(u); });

app.whenReady().then(createWindow);
app.on('second-instance', (_e, argv) => { const u = authUrl(argv); if (win) { if (win.isMinimized()) win.restore(); win.focus(); } if (u) sendAuth(u); });
app.on('window-all-closed', () => app.quit());
