const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vgERP', {

  // ── CONFIG / SYNC FOLDER ──────────────────────────────────────────────
  setSyncFolder:   ()     => ipcRenderer.invoke('config:setSyncFolder'),
  getSyncFolder:   ()     => ipcRenderer.invoke('config:getSyncFolder'),
  setOneDrivePath: ()     => ipcRenderer.invoke('config:setSyncFolder'),  // alias
  getOneDrivePath: ()     => ipcRenderer.invoke('config:getSyncFolder'),  // alias

  // ── FILE OPERATIONS ────────────────────────────────────────────────────
  saveFile:        (opts) => ipcRenderer.invoke('file:save', opts),
  saveDocument:    (opts) => ipcRenderer.invoke('file:saveDocument', opts),

  // ── APP ────────────────────────────────────────────────────────────────
  getVersion:      ()     => ipcRenderer.invoke('app:version'),
  openFolder:      (p)    => ipcRenderer.invoke('app:openFolder', p),
  getDbPath:       ()     => ipcRenderer.invoke('db:path'),

  // ── JSON DATA PERSISTENCE ──────────────────────────────────────────────
  // save: writes all entity data to vg_data_VEH.json etc.
  // load: reads entity data back from the JSON file
  // backup: creates a dated backup copy
  // info: lists all data files and sizes
  data: {
    saveGlobal: (data)       => ipcRenderer.invoke("data:saveGlobal", data),
    loadGlobal: ()           => ipcRenderer.invoke("data:loadGlobal"),
    save:   (entityCode, data)  => ipcRenderer.invoke('data:save',   { entityCode, data }),
    load:   (entityCode)        => ipcRenderer.invoke('data:load',   entityCode),
    backup: (entityCode)        => ipcRenderer.invoke('data:backup', entityCode),
    info:   ()                  => ipcRenderer.invoke('data:info'),
  },
});
