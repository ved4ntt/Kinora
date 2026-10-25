const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('kinoraWin', {
  act: (a) => ipcRenderer.send('win', a),
  onState: (cb) => ipcRenderer.on('win-state', (_e, s) => cb(s)),
  // Open a secure link in the system browser (used for Google sign-in) and receive kinora://auth links back.
  openExternal: (u) => ipcRenderer.send('open-external', u),
  onAuth: (cb) => ipcRenderer.on('auth-url', (_e, u) => cb(u)),
});
