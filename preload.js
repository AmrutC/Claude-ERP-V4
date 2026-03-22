const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vgERP', {

  // ── CONFIG / SYNC FOLDER ─────────────────────────────────────────────
  setSyncFolder:   ()     => ipcRenderer.invoke('config:setSyncFolder'),
  getSyncFolder:   ()     => ipcRenderer.invoke('config:getSyncFolder'),
  setOneDrivePath: ()     => ipcRenderer.invoke('config:setSyncFolder'),
  getOneDrivePath: ()     => ipcRenderer.invoke('config:getSyncFolder'),

  // ── FILE OPERATIONS ──────────────────────────────────────────────────
  saveFile:        (opts) => ipcRenderer.invoke('file:save', opts),
  saveDocument:    (opts) => ipcRenderer.invoke('file:saveDocument', opts),

  // ── APP ──────────────────────────────────────────────────────────────
  getVersion:      ()     => ipcRenderer.invoke('app:version'),
  openFolder:      (p)    => ipcRenderer.invoke('app:openFolder', p),
  getDbPath:       ()     => ipcRenderer.invoke('db:path'),

  // ── JSON DATA PERSISTENCE ─────────────────────────────────────────────
  data: {
    saveGlobal: (data)           => ipcRenderer.invoke('data:saveGlobal', data),
    loadGlobal: ()               => ipcRenderer.invoke('data:loadGlobal'),
    save:       (code, data)     => ipcRenderer.invoke('data:save', { entityCode:code, data }),
    load:       (code)           => ipcRenderer.invoke('data:load', code),
    backup:     (code)           => ipcRenderer.invoke('data:backup', code),
    info:       ()               => ipcRenderer.invoke('data:info'),
  },

  // ── DOCUMENT GENERATION ──────────────────────────────────────────────
  doc: {
    generatePO: (data) => ipcRenderer.invoke('doc:generatePO', data),
  },
});
