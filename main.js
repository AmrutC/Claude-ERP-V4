const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs   = require('fs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// ── DATA FOLDER ────────────────────────────────────────────────────────────
function getDataDir() {
  const cfgPath = path.join(app.getPath('userData'), 'sync_folder.txt');
  if (fs.existsSync(cfgPath)) {
    const p = fs.readFileSync(cfgPath, 'utf8').trim();
    if (p && fs.existsSync(p)) return p;
  }
  return app.getPath('userData');
}

// ── JSON DATA FILE PATH ────────────────────────────────────────────────────
// One file per entity: vg_data_VEH.json, vg_data_VL.json, vg_data_ME.json
function getDataFile(entityCode) {
  return path.join(getDataDir(), `vg_data_${entityCode || 'ALL'}.json`);
}

// ── WINDOW ─────────────────────────────────────────────────────────────────
let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 860, minWidth: 1100, minHeight: 700,
    title: 'Vision Grroup ERP v4.0',
    backgroundColor: '#0D1E35', show: false,
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    autoHideMenuBar: true,
  });
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url); return { action: 'deny' };
  });
}

// ── JSON PERSISTENCE IPC ───────────────────────────────────────────────────

// Save all data for an entity to a single JSON file
ipcMain.handle('data:save', (event, { entityCode, data }) => {
  try {
    const filePath = getDataFile(entityCode);
    // Keep a rolling backup of last save
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, filePath + '.bak');
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log('[VG ERP] Saved data for', entityCode, 'to', filePath);
    return { ok: true, path: filePath };
  } catch (err) {
    console.error('[VG ERP] Save error:', err.message);
    return { ok: false, error: err.message };
  }
});

// Load all data for an entity from JSON file
ipcMain.handle('data:load', (event, entityCode) => {
  try {
    const filePath = getDataFile(entityCode);
    if (!fs.existsSync(filePath)) {
      console.log('[VG ERP] No data file for', entityCode, '— starting fresh');
      return { ok: true, data: null };
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    console.log('[VG ERP] Loaded data for', entityCode, 'from', filePath);
    return { ok: true, data };
  } catch (err) {
    console.error('[VG ERP] Load error:', err.message);
    // Try backup if main file is corrupted
    const backupPath = getDataFile(entityCode) + '.bak';
    if (fs.existsSync(backupPath)) {
      try {
        const raw = fs.readFileSync(backupPath, 'utf8');
        const data = JSON.parse(raw);
        console.log('[VG ERP] Loaded from backup for', entityCode);
        return { ok: true, data, fromBackup: true };
      } catch {}
    }
    return { ok: false, error: err.message };
  }
});

// Get info about data files
ipcMain.handle('data:info', () => {
  try {
    const dir = getDataDir();
    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith('vg_data_') && f.endsWith('.json'))
      .map(f => {
        const stat = fs.statSync(path.join(dir, f));
        return { name: f, size: stat.size, modified: stat.mtime };
      });
    return { ok: true, dir, files };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// Manual backup
ipcMain.handle('data:backup', (event, entityCode) => {
  try {
    const src = getDataFile(entityCode);
    if (!fs.existsSync(src)) return { ok: false, error: 'No data file found' };
    const date = new Date().toISOString().slice(0,19).replace(/:/g,'-');
    const dir  = path.join(getDataDir(), 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const dst  = path.join(dir, `vg_data_${entityCode}_${date}.json`);
    fs.copyFileSync(src, dst);
    console.log('[VG ERP] Backup created:', dst);
    return { ok: true, path: dst };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── CONFIG IPC ─────────────────────────────────────────────────────────────
ipcMain.handle('config:setSyncFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Vision Grroup ERP Data Folder (OneDrive, local, or network)',
    properties: ['openDirectory'],
    buttonLabel: 'Use This Folder',
  });
  if (!result.canceled && result.filePaths[0]) {
    const p = result.filePaths[0];
    fs.writeFileSync(path.join(app.getPath('userData'), 'sync_folder.txt'), p);
    // Create subfolders
    ['backups','exports','documents','templates'].forEach(sub =>
      fs.mkdirSync(path.join(p, sub), { recursive: true })
    );
    return { ok: true, path: p };
  }
  return { ok: false };
});

ipcMain.handle('config:getSyncFolder', () => {
  const cfgPath = path.join(app.getPath('userData'), 'sync_folder.txt');
  if (fs.existsSync(cfgPath)) return fs.readFileSync(cfgPath, 'utf8').trim();
  return null;
});

// Keep old names working too
ipcMain.handle('config:setOneDrivePath', async () => {
  return ipcMain.emit('config:setSyncFolder');
});
ipcMain.handle('config:getOneDrivePath', () => {
  const cfgPath = path.join(app.getPath('userData'), 'sync_folder.txt');
  if (fs.existsSync(cfgPath)) return fs.readFileSync(cfgPath, 'utf8').trim();
  return null;
});

// ── FILE IPC ───────────────────────────────────────────────────────────────
ipcMain.handle('file:save', async (event, { defaultName, ext, data }) => {
  const filters = ext==='xlsx'?[{name:'Excel',extensions:['xlsx']}]:ext==='pdf'?[{name:'PDF',extensions:['pdf']}]:[{name:'All Files',extensions:['*']}];
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save File', defaultPath: path.join(app.getPath('documents'), defaultName), filters,
  });
  if (filePath) { fs.writeFileSync(filePath, Buffer.from(data)); return { ok:true, filePath }; }
  return { ok: false };
});

ipcMain.handle('file:saveDocument', (event, { folder, filename, data }) => {
  const dir = path.join(getDataDir(), 'documents', folder||'');
  fs.mkdirSync(dir, { recursive: true });
  const fp = path.join(dir, filename);
  fs.writeFileSync(fp, Buffer.from(data));
  return { ok: true, filePath: fp };
});

ipcMain.handle('db:backup',      () => ipcMain.emit('data:backup', null, 'ALL'));
ipcMain.handle('app:version',    () => app.getVersion());
ipcMain.handle('app:openFolder', (e, p) => shell.openPath(p));
ipcMain.handle('db:path',        () => getDataDir());

// ── LIFECYCLE ──────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length===0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform!=='darwin') app.quit(); });

// ── GLOBAL CONFIG (entities, shared settings) ──────────────────────────────
// Stored in vg_global.json — not per-entity
function getGlobalFile() {
  return path.join(getDataDir(), 'vg_global.json');
}

ipcMain.handle('data:saveGlobal', (event, data) => {
  try {
    const filePath = getGlobalFile();
    if (fs.existsSync(filePath)) fs.copyFileSync(filePath, filePath + '.bak');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log('[VG ERP] Saved global config to', filePath);
    return { ok: true, path: filePath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('data:loadGlobal', () => {
  try {
    const filePath = getGlobalFile();
    if (!fs.existsSync(filePath)) return { ok: true, data: null };
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log('[VG ERP] Loaded global config from', filePath);
    return { ok: true, data };
  } catch (err) {
    const bak = getGlobalFile() + '.bak';
    if (fs.existsSync(bak)) {
      try { return { ok: true, data: JSON.parse(fs.readFileSync(bak, 'utf8')), fromBackup: true }; } catch {}
    }
    return { ok: false, error: err.message };
  }
});
