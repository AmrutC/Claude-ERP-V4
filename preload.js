const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vgERP', {
  // Entity data
  data: {
    save:        (entityCode, data) => ipcRenderer.invoke('data:save', { entityCode, data }),
    load:        (entityCode)       => ipcRenderer.invoke('data:load', entityCode),
    saveGlobal:  (data)             => ipcRenderer.invoke('data:saveGlobal', data),
    loadGlobal:  ()                 => ipcRenderer.invoke('data:loadGlobal'),
    info:        ()                 => ipcRenderer.invoke('data:info'),
  },
  // App
  getSyncFolder: () => ipcRenderer.invoke('app:getSyncFolder'),
  setSyncFolder: () => ipcRenderer.invoke('app:setSyncFolder'),
  openFolder:    (p) => ipcRenderer.invoke('app:openFolder', p),
  openWhatsApp:  (phone) => ipcRenderer.invoke('app:openWhatsApp', phone),
  // Backup
  backup: {
    create:  (opts)   => ipcRenderer.invoke('backup:create', opts),
    list:    ()       => ipcRenderer.invoke('backup:list'),
    restore: (bpath)  => ipcRenderer.invoke('backup:restore', bpath),
  },
  // Tally import
  tally: {
    readFile: () => ipcRenderer.invoke('tally:readFile'),
  },
  // OCR
  ocr: {
    readFile: () => ipcRenderer.invoke('ocr:readFile'),
  },
  // Photo
  photo: {
    save: (base64, fileName) => ipcRenderer.invoke('photo:save', { base64, fileName }),
  },
  // Documents
  doc: {
    save: (buffer, suggestedName, type) => ipcRenderer.invoke('doc:save', { buffer, suggestedName, type }),
  },
  // CSV
  csv: {
    read:   ()                          => ipcRenderer.invoke('csv:read'),
    export: (content, suggestedName)    => ipcRenderer.invoke('export:csv', { content, suggestedName }),
  },
});
