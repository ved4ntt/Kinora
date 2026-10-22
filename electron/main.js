// Kinora for Windows: frameless full-screen window around the Kinora site with a built-in streaming server.
const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const { startServer } = require('./localserver');

app.commandLine.appendSwitch('enable-features', 'PlatformHEVCDecoderSupport');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

if (!app.requestSingleInstanceLock()) app.quit();

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
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });

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
  else if (a === 'quit') app.quit();
  else if (a === 'back') nav('back');
  else if (a === 'forward') nav('forward');
});

app.whenReady().then(createWindow);
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => app.quit());
