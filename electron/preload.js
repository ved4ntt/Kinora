const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('kinoraWin', {
  act: (a) => ipcRenderer.send('win', a),
  onState: (cb) => ipcRenderer.on('win-state', (_e, s) => cb(s)),
  // Open a secure link in the system browser (used for Google sign-in) and receive kinora://auth links back.
  openExternal: (u) => ipcRenderer.send('open-external', u),
  // mpv / VLC for the smoothest playback when one is installed
  playerInfo: () => ipcRenderer.invoke('ext:info'),
  playExternal: (o) => ipcRenderer.invoke('ext:play', o),
  // graphics driver report: is hardware video decoding really on (used by the Settings device check)
  sysCaps: () => ipcRenderer.invoke('sys:caps'),
  onAuth: (cb) => ipcRenderer.on('auth-url', (_e, u) => cb(u)),
  // App updates (electron-updater reads GitHub Releases; the page decides when to check, download and install).
  upd: {
    version: () => ipcRenderer.invoke('upd:version'),
    check: () => ipcRenderer.invoke('upd:check'),
    download: () => ipcRenderer.invoke('upd:download'),
    install: () => ipcRenderer.send('upd:install'),
    on: (cb) => ipcRenderer.on('upd:event', (_e, s) => cb(s)),
  },
  // mpv video engine (beta). Everything answers { ok:false } / nothing when the engine is off, so the page can always fall back to the built-in player.
  mpv: {
    info: () => ipcRenderer.invoke('mpv:info'),
    engine: () => ipcRenderer.invoke('mpv:engine'),
    setEngine: (n) => ipcRenderer.invoke('mpv:setEngine', n),
    relaunch: () => ipcRenderer.send('mpv:relaunch'),
    load: (o) => ipcRenderer.invoke('mpv:load', o),
    cmd: (c, v) => ipcRenderer.send('mpv:cmd', { c, v }),
    stop: () => ipcRenderer.invoke('mpv:stop'),
    onState: (cb) => ipcRenderer.on('mpv:state', (_e, s) => cb(s)),
  },
});
