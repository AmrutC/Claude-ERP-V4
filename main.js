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

function getDataFile(entityCode) {
  return path.join(getDataDir(), `vg_data_${entityCode || 'ALL'}.json`);
}

function getGlobalFile() {
  return path.join(getDataDir(), 'vg_global.json');
}

function getBackupDir(dated) {
  const base = path.join(getDataDir(), 'backups');
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
  if (dated) {
    const d = new Date().toISOString().split('T')[0];
    const dir = path.join(base, d);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
  return base;
}

// ── WINDOW ─────────────────────────────────────────────────────────────────
let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 880, minWidth: 1200, minHeight: 720,
    title: 'Vision Grroup ERP v5.0',
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

app.whenReady().then(() => {
  createWindow();
  // Auto-backup on startup (daily)
  setTimeout(async () => {
    try {
      const dir = getDataDir();
      const today = new Date().toISOString().split('T')[0];
      const backupDir = path.join(dir, 'backups', today);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
        for (const f of files) fs.copyFileSync(path.join(dir, f), path.join(backupDir, f));
        console.log('[VG ERP] Auto-backup created for', today);
      }
    } catch (e) { console.warn('[VG ERP] Auto-backup failed:', e.message); }
  }, 5000);
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ── ENTITY DATA: SAVE / LOAD ───────────────────────────────────────────────
ipcMain.handle('data:save', (event, { entityCode, data }) => {
  try {
    const filePath = getDataFile(entityCode);
    if (fs.existsSync(filePath)) fs.copyFileSync(filePath, filePath + '.bak');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return { ok: true, path: filePath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('data:load', (event, entityCode) => {
  try {
    const filePath = getDataFile(entityCode);
    if (!fs.existsSync(filePath)) return { ok: true, data: null };
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return { ok: true, data };
  } catch (err) {
    const backupPath = getDataFile(entityCode) + '.bak';
    if (fs.existsSync(backupPath)) {
      try { return { ok: true, data: JSON.parse(fs.readFileSync(backupPath, 'utf8')), fromBackup: true }; } catch {}
    }
    return { ok: false, error: err.message };
  }
});

// ── GLOBAL DATA: SAVE / LOAD ───────────────────────────────────────────────
ipcMain.handle('data:saveGlobal', (event, data) => {
  try {
    const filePath = getGlobalFile();
    if (fs.existsSync(filePath)) fs.copyFileSync(filePath, filePath + '.bak');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('data:loadGlobal', () => {
  try {
    const filePath = getGlobalFile();
    if (!fs.existsSync(filePath)) return { ok: true, data: null };
    return { ok: true, data: JSON.parse(fs.readFileSync(filePath, 'utf8')) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── DATA INFO ──────────────────────────────────────────────────────────────
ipcMain.handle('data:info', () => {
  try {
    const dir = getDataDir();
    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith('vg_data_') && f.endsWith('.json'))
      .map(f => {
        const fp = path.join(dir, f);
        const st = fs.statSync(fp);
        return { name: f, size: st.size, modified: st.mtime };
      });
    return { ok: true, dir, files };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── SYNC FOLDER ────────────────────────────────────────────────────────────
ipcMain.handle('app:getSyncFolder', () => {
  try {
    const cfgPath = path.join(app.getPath('userData'), 'sync_folder.txt');
    if (fs.existsSync(cfgPath)) {
      const p = fs.readFileSync(cfgPath, 'utf8').trim();
      if (p && fs.existsSync(p)) return p;
    }
    return null;
  } catch { return null; }
});

ipcMain.handle('app:setSyncFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Sync Folder (OneDrive or Local)',
    properties: ['openDirectory'],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const chosen = result.filePaths[0];
  const cfgPath = path.join(app.getPath('userData'), 'sync_folder.txt');
  fs.writeFileSync(cfgPath, chosen, 'utf8');
  return chosen;
});

ipcMain.handle('app:openFolder', (event, folderPath) => {
  shell.openPath(folderPath || getDataDir());
});

// ── BACKUP ─────────────────────────────────────────────────────────────────
ipcMain.handle('backup:create', async (event, { label } = {}) => {
  try {
    const dir = getDataDir();
    const ts = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backupDir = path.join(getBackupDir(false), ts + (label ? '_' + label : ''));
    fs.mkdirSync(backupDir, { recursive: true });
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    let totalSize = 0;
    for (const f of files) {
      const src = path.join(dir, f);
      fs.copyFileSync(src, path.join(backupDir, f));
      totalSize += fs.statSync(src).size;
    }
    return { ok: true, path: backupDir, fileCount: files.length, size: totalSize, ts };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('backup:list', () => {
  try {
    const base = path.join(getDataDir(), 'backups');
    if (!fs.existsSync(base)) return { ok: true, backups: [] };
    const backups = fs.readdirSync(base)
      .filter(d => fs.statSync(path.join(base, d)).isDirectory())
      .map(d => {
        const dirPath = path.join(base, d);
        const files = fs.readdirSync(dirPath);
        const size = files.reduce((acc, f) => acc + fs.statSync(path.join(dirPath, f)).size, 0);
        return { name: d, path: dirPath, fileCount: files.length, size, ts: d };
      })
      .sort((a, b) => b.name.localeCompare(a.name));
    return { ok: true, backups };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('backup:restore', (event, backupPath) => {
  try {
    const dir = getDataDir();
    const files = fs.readdirSync(backupPath).filter(f => f.endsWith('.json'));
    for (const f of files) {
      fs.copyFileSync(path.join(backupPath, f), path.join(dir, f));
    }
    return { ok: true, fileCount: files.length };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── TALLY IMPORT: READ XML FILE ────────────────────────────────────────────
ipcMain.handle('tally:readFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Tally XML Export',
    filters: [{ name: 'XML Files', extensions: ['xml'] }],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false, cancelled: true };
  try {
    const content = fs.readFileSync(result.filePaths[0], 'utf8');
    return { ok: true, content, filePath: result.filePaths[0] };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── OCR: READ IMAGE / PDF FOR TESSERACT ───────────────────────────────────
ipcMain.handle('ocr:readFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Image or PDF for OCR',
    filters: [{ name: 'Images & PDF', extensions: ['jpg', 'jpeg', 'png', 'pdf'] }],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false, cancelled: true };
  try {
    const buffer = fs.readFileSync(result.filePaths[0]);
    const base64 = buffer.toString('base64');
    const ext = path.extname(result.filePaths[0]).toLowerCase().replace('.', '');
    return { ok: true, base64, ext, filePath: result.filePaths[0], fileName: path.basename(result.filePaths[0]) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── PHOTO SAVE ─────────────────────────────────────────────────────────────
ipcMain.handle('photo:save', (event, { base64, fileName }) => {
  try {
    const photosDir = path.join(getDataDir(), 'photos');
    if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });
    const buffer = Buffer.from(base64, 'base64');
    const filePath = path.join(photosDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return { ok: true, path: filePath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── DOCUMENT: SAVE DOCX / PDF ─────────────────────────────────────────────
ipcMain.handle('doc:save', async (event, { buffer, suggestedName, type }) => {
  const ext = type === 'pdf' ? 'pdf' : 'docx';
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Document',
    defaultPath: suggestedName || `document.${ext}`,
    filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
  });
  if (result.canceled || !result.filePath) return { ok: false, cancelled: true };
  try {
    fs.writeFileSync(result.filePath, Buffer.from(buffer));
    shell.openPath(result.filePath);
    return { ok: true, path: result.filePath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── CSV IMPORT: READ CSV ───────────────────────────────────────────────────
ipcMain.handle('csv:read', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select CSV File',
    filters: [{ name: 'CSV', extensions: ['csv'] }],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false, cancelled: true };
  try {
    const content = fs.readFileSync(result.filePaths[0], 'utf8');
    return { ok: true, content, fileName: path.basename(result.filePaths[0]) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── WHATSAPP LINK ─────────────────────────────────────────────────────────
ipcMain.handle('app:openWhatsApp', (event, phone) => {
  const clean = (phone || '').replace(/\D/g, '');
  shell.openExternal(`https://wa.me/91${clean}`);
});

// ── EXPORT CSV ─────────────────────────────────────────────────────────────
ipcMain.handle('export:csv', async (event, { content, suggestedName }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export CSV',
    defaultPath: suggestedName || 'export.csv',
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (result.canceled || !result.filePath) return { ok: false, cancelled: true };
  try {
    fs.writeFileSync(result.filePath, content, 'utf8');
    shell.openPath(result.filePath);
    return { ok: true, path: result.filePath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
