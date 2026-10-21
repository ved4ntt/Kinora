const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('kinoraWin', {
  act: (a) => ipcRenderer.send('win', a),
  onState: (cb) => ipcRenderer.on('win-state', (_e, s) => cb(s)),
});
