// Kinora for Windows: frameless full-screen window around the Kinora site with a built-in streaming server.
const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const { startServer } = require('./localserver');

app.commandLine.appendSwitch('enable-features', 'PlatformHEVCDecoderSupport');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

if (!app.requestSingleInstanceLock()) app.quit();

let win;
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
  // Mouse "back" / "forward" side buttons and keyboard back (Alt+Left)
  win.on('app-command', (e, cmd) => {
    if (cmd === 'browser-backward' && win.webContents.canGoBack()) win.webContents.goBack();
    if (cmd === 'browser-forward' && win.webContents.canGoForward()) win.webContents.goForward();
  });
  const st = () => win.webContents.send('win-state', { max: win.isMaximized(), full: win.isFullScreen() });
  ['maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen'].forEach((ev) => win.on(ev, st));
}

ipcMain.on('win', (_e, a) => {
  if (!win) return;
  if (a === 'min') win.minimize();
  else if (a === 'max') win.isMaximized() ? win.unmaximize() : win.maximize();
  else if (a === 'quit') app.quit();
});

app.whenReady().then(createWindow);
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => app.quit());
