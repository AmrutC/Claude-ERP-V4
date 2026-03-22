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

// ── PURCHASE ORDER — Word file generation ─────────────────────────────────
ipcMain.handle('doc:generatePO', async (event, poData) => {
  try {
    // Dynamic import of docx (must be installed: npm install docx)
    let docxLib;
    try { docxLib = require('docx'); }
    catch { return { ok:false, error:'docx package not installed. Run: npm install docx' }; }

    const {
      Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
      AlignmentType, WidthType, BorderStyle, ShadingType, VerticalAlign,
    } = docxLib;

    const { vendor, project, items, poNumber, poDate, deliveryAddress, notes, terms, entityName } = poData;

    const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
    const borders = { top:border, bottom:border, left:border, right:border };
    const noBorder = { style: BorderStyle.NONE };
    const noBorders = { top:noBorder, bottom:noBorder, left:noBorder, right:noBorder };
    const cellM = { top:100, bottom:100, left:120, right:120 };

    function hdrCell(text, w, bg='1B2D4F') {
      return new TableCell({
        width:{size:w,type:WidthType.DXA}, borders,
        shading:{fill:bg,type:ShadingType.CLEAR}, margins:cellM,
        verticalAlign:VerticalAlign.CENTER,
        children:[new Paragraph({ alignment:AlignmentType.CENTER, children:[new TextRun({text,bold:true,color:'FFFFFF',size:20,font:'Arial'})] })]
      });
    }
    function dataCell(text, w, right=false, bold=false) {
      return new TableCell({
        width:{size:w,type:WidthType.DXA}, borders, margins:cellM,
        children:[new Paragraph({ alignment:right?AlignmentType.RIGHT:AlignmentType.LEFT, children:[new TextRun({text:String(text||''),bold,size:20,font:'Arial'})] })]
      });
    }
    function labelCell(text, w) {
      return new TableCell({
        width:{size:w,type:WidthType.DXA}, borders,
        shading:{fill:'F0F4F8',type:ShadingType.CLEAR}, margins:cellM,
        children:[new Paragraph({ children:[new TextRun({text,bold:true,size:20,font:'Arial',color:'374151'})] })]
      });
    }
    function infoRow(label, value, w1=2200, w2=2700) {
      return new TableRow({ children:[labelCell(label,w1), dataCell(value,w2)] });
    }

    // Item rows
    const subtotal = items.reduce((s,it)=>s+(Number(it.qty||0)*Number(it.rate||0)),0);
    const gstAmt   = Math.round(subtotal * Number(poData.gstRate||18) / 100);
    const grandTotal = subtotal + gstAmt;

    const itemRows = items.map((it,i)=>
      new TableRow({ children:[
        dataCell(String(i+1), 500, true),
        dataCell(it.description||'', 3600),
        dataCell(it.unit||'Nos', 800, true),
        dataCell(String(it.qty||''), 700, true),
        dataCell('₹'+Number(it.rate||0).toLocaleString('en-IN'), 1100, true),
        dataCell('₹'+(Number(it.qty||0)*Number(it.rate||0)).toLocaleString('en-IN'), 1260, true, true),
      ]})
    );

    const doc = new Document({
      sections:[{
        properties:{ page:{ size:{width:12240,height:15840}, margin:{top:900,bottom:900,left:1080,right:1080} } },
        children:[
          // Title
          new Paragraph({ alignment:AlignmentType.CENTER, spacing:{after:80}, children:[
            new TextRun({text:'PURCHASE ORDER', bold:true, size:36, font:'Arial', color:'1B2D4F'})
          ]}),
          new Paragraph({ alignment:AlignmentType.CENTER, spacing:{after:200}, border:{bottom:{style:BorderStyle.SINGLE,size:6,color:'C9951E',space:1}}, children:[
            new TextRun({text:entityName||'Vision Grroup', size:22, font:'Arial', color:'6B7280'})
          ]}),
          new Paragraph({ spacing:{after:160} }),

          // PO Info + Vendor + Delivery — 2-column table
          new Table({
            width:{size:10080,type:WidthType.DXA}, columnWidths:[4900,5180],
            rows:[
              new TableRow({ children:[
                new TableCell({ width:{size:4900,type:WidthType.DXA}, borders:noBorders, children:[
                  new Table({ width:{size:4900,type:WidthType.DXA}, columnWidths:[2200,2700],
                    rows:[
                      new TableRow({ children:[
                        new TableCell({width:{size:4900,type:WidthType.DXA},borders:{bottom:{style:BorderStyle.SINGLE,size:2,color:'1B2D4F'}},colSpan:2,shading:{fill:'1B2D4F',type:ShadingType.CLEAR},margins:cellM,children:[new Paragraph({children:[new TextRun({text:'PO DETAILS',bold:true,color:'FFFFFF',size:20,font:'Arial'})]})]}),
                      ]}),
                      infoRow('PO Number', poNumber||'—'),
                      infoRow('PO Date', poDate||'—'),
                      infoRow('Project', project?.name||'—'),
                      infoRow('GST Rate', (poData.gstRate||18)+'%'),
                    ]
                  })
                ]}),
                new TableCell({ width:{size:5180,type:WidthType.DXA}, borders:noBorders, children:[
                  new Table({ width:{size:5180,type:WidthType.DXA}, columnWidths:[2200,2980],
                    rows:[
                      new TableRow({ children:[
                        new TableCell({width:{size:5180,type:WidthType.DXA},borders:{bottom:{style:BorderStyle.SINGLE,size:2,color:'1B2D4F'}},colSpan:2,shading:{fill:'1B2D4F',type:ShadingType.CLEAR},margins:cellM,children:[new Paragraph({children:[new TextRun({text:'VENDOR DETAILS',bold:true,color:'FFFFFF',size:20,font:'Arial'})]})]}),
                      ]}),
                      infoRow('Vendor Name',  vendor?.name||'—', 2200, 2980),
                      infoRow('Phone',        vendor?.phone||'—', 2200, 2980),
                      infoRow('GSTIN',        vendor?.gstin||'—', 2200, 2980),
                      infoRow('PAN',          vendor?.pan||'—', 2200, 2980),
                    ]
                  })
                ]}),
              ]})
            ]
          }),
          new Paragraph({ spacing:{after:120} }),

          // Delivery address
          ...(deliveryAddress ? [
            new Paragraph({ children:[new TextRun({text:'Delivery / Shipping Address:',bold:true,size:20,font:'Arial',color:'1B2D4F'})], spacing:{after:60} }),
            new Paragraph({ children:[new TextRun({text:deliveryAddress, size:20, font:'Arial'})], spacing:{after:160} }),
          ] : [new Paragraph({spacing:{after:160}})]),

          // Items table
          new Table({
            width:{size:10080,type:WidthType.DXA}, columnWidths:[500,3600,800,700,1100,1380],
            rows:[
              new TableRow({ tableHeader:true, children:[
                hdrCell('#',500), hdrCell('Description of Items/Work',3600),
                hdrCell('Unit',800), hdrCell('Qty',700),
                hdrCell('Rate (₹)',1100), hdrCell('Amount (₹)',1380),
              ]}),
              ...itemRows,
              // Subtotal
              new TableRow({ children:[
                dataCell('',500), dataCell('',3600), dataCell('',800), dataCell('',700),
                dataCell('Sub Total', 1100, true, true),
                dataCell('₹'+subtotal.toLocaleString('en-IN'), 1380, true, true),
              ]}),
              // GST
              new TableRow({ children:[
                dataCell('',500), dataCell('',3600), dataCell('',800), dataCell('',700),
                dataCell('GST @'+(poData.gstRate||18)+'%', 1100, true),
                dataCell('₹'+gstAmt.toLocaleString('en-IN'), 1380, true),
              ]}),
              // Grand total
              new TableRow({ children:[
                new TableCell({width:{size:500},borders,children:[new Paragraph({children:[]})]}),
                new TableCell({width:{size:3600},borders,children:[new Paragraph({children:[]})]}),
                new TableCell({width:{size:800},borders,children:[new Paragraph({children:[]})]}),
                new TableCell({width:{size:700},borders,children:[new Paragraph({children:[]})]}),
                new TableCell({width:{size:1100},borders,shading:{fill:'1B2D4F',type:ShadingType.CLEAR},margins:cellM,children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({text:'GRAND TOTAL',bold:true,color:'FFFFFF',size:20,font:'Arial'})]})]}) ,
                new TableCell({width:{size:1380},borders,shading:{fill:'C9951E',type:ShadingType.CLEAR},margins:cellM,children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({text:'₹'+grandTotal.toLocaleString('en-IN'),bold:true,color:'FFFFFF',size:22,font:'Arial'})]})]}),
              ]}),
            ]
          }),

          new Paragraph({ spacing:{after:200} }),

          // Notes
          ...(notes ? [
            new Paragraph({ spacing:{after:60}, children:[new TextRun({text:'Notes / Instructions:',bold:true,size:20,font:'Arial',color:'1B2D4F'})] }),
            new Paragraph({ spacing:{after:160}, children:[new TextRun({text:notes,size:20,font:'Arial'})] }),
          ] : []),

          // Terms
          ...(terms ? [
            new Paragraph({ spacing:{after:60}, children:[new TextRun({text:'Terms & Conditions:',bold:true,size:20,font:'Arial',color:'1B2D4F'})] }),
            new Paragraph({ spacing:{after:200}, children:[new TextRun({text:terms,size:20,font:'Arial'})] }),
          ] : []),

          // Signature
          new Table({
            width:{size:10080,type:WidthType.DXA}, columnWidths:[5040,5040],
            rows:[new TableRow({ children:[
              new TableCell({width:{size:5040,type:WidthType.DXA},borders:noBorders,margins:cellM,children:[
                new Paragraph({children:[new TextRun({text:'Prepared by:',size:18,font:'Arial',color:'6B7280'})]}),
                new Paragraph({spacing:{after:600},children:[]}),
                new Paragraph({border:{bottom:{style:BorderStyle.SINGLE,size:4,color:'374151'}},children:[new Paragraph({children:[]})]}),
                new Paragraph({children:[new TextRun({text:'Signature',size:18,font:'Arial',color:'9CA3AF'})]})
              ]}),
              new TableCell({width:{size:5040,type:WidthType.DXA},borders:noBorders,margins:cellM,children:[
                new Paragraph({children:[new TextRun({text:'Authorized by:',size:18,font:'Arial',color:'6B7280'})]}),
                new Paragraph({spacing:{after:600},children:[]}),
                new Paragraph({border:{bottom:{style:BorderStyle.SINGLE,size:4,color:'374151'}},children:[new Paragraph({children:[]})]}),
                new Paragraph({children:[new TextRun({text:'Signature',size:18,font:'Arial',color:'9CA3AF'})]})
              ]}),
            ]})]
          }),
        ]
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    const dir  = path.join(getDataDir(), 'documents', 'purchase_orders');
    fs.mkdirSync(dir, { recursive:true });
    const filename = `PO_${(poNumber||'').replace(/\//g,'_')}_${Date.now()}.docx`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, buffer);
    shell.openPath(filePath); // Open in Word automatically
    return { ok:true, filePath };
  } catch(err) {
    console.error('[VG ERP] PO generation error:', err.message);
    return { ok:false, error:err.message };
  }
});
