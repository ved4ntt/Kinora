// Kinora for Windows: a desktop window around the Kinora website with a built-in streaming server.
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { startServer } = require('./localserver');

// Let the built-in browser use hardware decoding for HEVC (x265) when the PC supports it.
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
    backgroundColor: '#07080b', title: 'Kinora', autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, webSecurity: false },
  });
  win.loadURL(`http://127.0.0.1:${port}/index.html`);
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

app.whenReady().then(createWindow);
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => app.quit());
