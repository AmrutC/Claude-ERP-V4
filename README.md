# Vision Grroup ERP v4.0
### Real Estate Developer ERP — Setup & Developer Guide

---

## WHAT THIS IS

A complete Electron desktop application for Vision Grroup's real estate operations.
Built with React + SQLite + OneDrive sync. Windows x64 only.

**13 Modules:** Admin Setup · CRM & Leads · Project & Inventory · Customers & Bookings ·
Payments & Collections · Document Automation · Accounts & Ledger · GST & Tax Reports ·
HR & Payroll · Brokerage · Vendors & Contractors · MIS & Reports · Audit Log

**Entities covered:** Vision Estate Holdings Pvt Ltd · Vision Lifespaces Pvt Ltd · Mangaldeep Enterprises

---

## FILES IN THIS PACKAGE

```
vg-erp/
├── main.js               ← Electron main process (window, IPC, file I/O)
├── preload.js            ← Secure bridge: renderer ↔ main
├── package.json          ← Dependencies + build config
├── vite.config.js        ← React/Vite build config
├── tailwind.config.js    ← UI styling config
├── postcss.config.js     ← CSS processing
├── index.html            ← HTML entry point
├── assets/
│   └── icon.ico          ← App icon (add your 256×256 ICO here)
└── src/
    ├── main.jsx          ← React entry point
    ├── index.css         ← Global styles (Tailwind + custom classes)
    ├── App.jsx           ← Root component (auth guard, setup flow)
    ├── db/
    │   ├── schema.sql    ← Complete SQLite schema (45 tables)
    │   └── client.js     ← DB helper functions (runs in main process)
    ├── stores/
    │   └── appStore.js   ← Zustand global state (auth, entity, navigation)
    ├── utils/
    │   ├── index.js      ← inr(), fmtDate(), numWords(), suggestGSTRate()
    │   ├── docEngine.js  ← PDF receipt + demand notice + Word merge engine
    │   └── excelExport.js← Excel export for all modules + Tally XML
    └── components/
        ├── Login.jsx     ← Login screen (branded)
        ├── Setup.jsx     ← First-run OneDrive folder setup
        ├── Shell.jsx     ← App shell (sidebar + topbar + module router)
        ├── Sidebar.jsx   ← Navigation sidebar with entity selector
        ├── Topbar.jsx    ← Top bar with sync status
        ├── ui/
        │   ├── Toast.jsx      ← Toast notifications
        │   ├── StatCard.jsx   ← KPI metric cards
        │   ├── Table.jsx      ← Reusable table components
        │   ├── Modal.jsx      ← Modal dialog wrapper
        │   ├── Badge.jsx      ← Status badges (all statuses pre-styled)
        │   └── FormField.jsx  ← Form field + grid helpers
        └── modules/
            ├── Dashboard.jsx  ← ✅ Full executive dashboard with charts
            ├── Inventory.jsx  ← ✅ Interactive inventory map (grid + list)
            ├── Projects.jsx   ← 🔧 Ready for development
            ├── CRM.jsx        ← 🔧 Ready for development
            ├── Bookings.jsx   ← 🔧 Ready for development
            ├── Payments.jsx   ← 🔧 Ready for development
            ├── Documents.jsx  ← 🔧 Ready for development
            ├── Accounts.jsx   ← 🔧 Ready for development
            ├── GST.jsx        ← 🔧 Ready for development
            ├── HR.jsx         ← 🔧 Ready for development
            ├── Brokerage.jsx  ← 🔧 Ready for development
            ├── Vendors.jsx    ← 🔧 Ready for development
            ├── MIS.jsx        ← 🔧 Ready for development
            ├── AuditLog.jsx   ← 🔧 Ready for development
            ├── Communication.jsx ← 🔧 Ready for development
            └── AdminSetup.jsx ← 🔧 Ready for development
```

---

## STEP-BY-STEP SETUP

### STEP 1 — Install Prerequisites

You need **Node.js 20 LTS** and **Git** (optional).

1. Go to https://nodejs.org → Download **LTS version** → Install
2. Open **Command Prompt** and verify:
   ```
   node --version    (should show v20.x.x or higher)
   npm --version     (should show 10.x.x or higher)
   ```
   If not found, restart Command Prompt and try again.

---

### STEP 2 — Extract & Open the Project

1. Extract `vg-erp.zip` to a folder, e.g. `C:\Projects\vg-erp\`
2. Open **Command Prompt** in that folder:
   - Navigate to the folder in File Explorer
   - Click the address bar, type `cmd`, press Enter

---

### STEP 3 — Install Dependencies

```
npm install
```

This downloads all packages (~200 MB). Takes 3–5 minutes first time.

If you see errors about `better-sqlite3`, run:
```
npm rebuild better-sqlite3
```

---

### STEP 4 — Add Your App Icon

1. Take the Vision Grroup logo (PNG, minimum 256×256)
2. Convert to `.ico` at https://icoconvert.com (select all sizes)
3. Save as `icon.ico` in the `assets/` folder

---

### STEP 5 — Test the App (Before Building)

```
npm run dev
```

This starts the React dev server AND opens the Electron window.

**First run — you will see a Setup screen:**
1. Click "Choose OneDrive Folder"
2. Browse to your **OneDrive Business** folder
3. Create a new folder called `Vision Grroup ERP` inside it
4. Select that folder and click OK

The app will create all subfolders automatically:
```
Vision Grroup ERP/
  vg_erp.db          ← Your database (auto-created)
  backups/
  exports/
  documents/
  templates/word/
  templates/pdf/
  kyc/
  audit/
```

**First Login:**
- Username: `admin`
- Password: `Admin@1234`
- ⚠️ Change this password immediately in Admin Setup → Users

---

### STEP 6 — Build the Windows Installer

Once testing is done:
```
npm run build
```

This creates two files in the `release/` folder:
- `Vision Grroup ERP Setup 4.0.0.exe` — Full installer (recommended)
- `Vision Grroup ERP 4.0.0.exe` — Portable (no install needed)

Build takes 5–10 minutes.

---

### STEP 7 — Install on Team PCs

1. Copy `Vision Grroup ERP Setup 4.0.0.exe` to each team member's PC
2. Double-click → Install (choose installation directory)
3. First run on each PC → Setup screen → **select the same shared OneDrive folder**
4. Each team member logs in with their own username/password (created in Admin Setup)

---

## ONEDRIVE SYNC — HOW IT WORKS

```
PC 1 (Director)          PC 2 (Accounts)         PC 3 (Sales)
     │                        │                       │
     └─── Write vg_erp.db ────┘                       │
                │                                     │
          OneDrive Business ──── Sync ────────────────┘
          Vision Grroup ERP/
          vg_erp.db          ← Single source of truth
```

- All team members point the app to the **same shared OneDrive folder**
- OneDrive syncs the `.db` file across all PCs automatically
- When you save a record, it writes to the local `.db` → OneDrive syncs to cloud → other PCs get the update within seconds
- The sidebar shows `● OneDrive synced` when your local copy is up to date
- **Important:** Only one person should edit the same record at the same time. The system shows a soft lock warning if a record was edited very recently.

---

## DEVELOPER GUIDE — COMPLETING THE MODULES

### Architecture

```
User clicks button
      ↓
React component (src/components/modules/X.jsx)
      ↓
window.vgERP.someAction()    ← preload.js bridge
      ↓
ipcRenderer.invoke('action')
      ↓
ipcMain.handle('action')     ← main.js
      ↓
src/db/client.js             ← better-sqlite3 queries
      ↓
vg_erp.db (SQLite file)
```

### Adding a new feature (example: Bookings list)

1. **Open** `src/components/modules/Bookings.jsx`

2. **Add IPC handler** in `main.js`:
   ```javascript
   ipcMain.handle('bookings:getAll', (e, entityId) => {
     const db = getDB(getDataDir() + '/vg_erp.db');
     return db.prepare('SELECT b.*, u.unit_no, p.name as project_name, a.name as allottee_name FROM bookings b JOIN units u ON u.id=b.unit_id JOIN projects p ON p.id=b.project_id JOIN allottees a ON a.booking_id=b.id AND a.applicant_order=1 WHERE b.entity_id=? AND b.deleted_at IS NULL').all(entityId);
   });
   ```

3. **Expose in** `preload.js`:
   ```javascript
   getBookings: (entityId) => ipcRenderer.invoke('bookings:getAll', entityId),
   ```

4. **Call in component:**
   ```javascript
   useEffect(() => {
     window.vgERP.getBookings(activeEntity?.id).then(setBookings);
   }, [activeEntity]);
   ```

5. **Audit every write** — always call the audit helper:
   ```javascript
   audit(db, { userId, entityId, module:'bookings', event:'CREATE', ref:'BKG/VEH/26-27/001' });
   ```

### Document Generation (Receipt)

```javascript
// In a component:
const buf = await window.vgERP.generateReceipt({ receiptData });
await window.vgERP.saveDocument({ folder:'RCP', filename:'RCP-VEH-26-27-001.docx', data: Array.from(buf) });
```

### Key helper functions in `src/utils/index.js`

| Function | Use |
|---|---|
| `inr(amount)` | Format ₹1,23,456 |
| `inr(amount, true)` | Compact: ₹1.23L |
| `fmtDate(dateStr)` | 15 Mar 2026 |
| `numWords(n)` | One Lakh Twenty Three Thousand |
| `suggestGSTRate(area, value)` | Returns 1 or 5 |
| `computeGST(price, rate)` | Returns {base, gst, total} |
| `reraAlertLevel(expiryDate)` | Returns alert level for RERA |
| `currentFY()` | Returns '26-27' |

---

## USER MANAGEMENT

After first login, go to **Admin Setup → Users** to:
1. Change the default admin password
2. Create user accounts for each team member:
   - Director → role: `director`
   - Accounts person → role: `accounts_manager`
   - Sales staff → role: `sales_executive`
   - HR → role: `hr_manager`
   - Brokers → role: `broker`
   - Legal/Doc person → role: `legal_doc_user`
3. Assign entity access (which entities each user can see)

---

## DATA BACKUP

**Automatic:** The app takes a backup of `vg_erp.db` to the `backups/` folder every time it closes. Files are named `vg_erp_YYYYMMDD.db`.

**Manual:** Admin Setup → Database → Backup Now

**Recovery:** Copy any `vg_erp_YYYYMMDD.db` from `backups/` and rename it to `vg_erp.db`.

---

## EMAIL SETUP (Outlook / Microsoft 365)

Go to **Admin Setup → Settings → Email Configuration**:

| Setting | Value |
|---|---|
| SMTP Host | `smtp.office365.com` |
| SMTP Port | `587` |
| Username | `accounts@visiongrroup.in` (your actual email) |
| Password | Your Microsoft 365 password or App Password |
| From Name | `Vision Grroup ERP` |
| From Email | `accounts@visiongrroup.in` |

If using 2-factor authentication on Microsoft 365, generate an **App Password** in your Microsoft account settings and use that instead of your regular password.

---

## COMMON ISSUES

| Problem | Solution |
|---|---|
| `npm install` fails | Run `npm install --legacy-peer-deps` |
| `better-sqlite3` error | Run `npm rebuild better-sqlite3` |
| App shows blank white screen | Press Ctrl+Shift+I in dev mode, check Console tab for errors |
| Antivirus blocks the .exe | Add the `release/` folder as an exception in your antivirus |
| OneDrive not syncing | Check OneDrive is running (look for cloud icon in system tray). Make sure all PCs are signed into the same Microsoft 365 account |
| Login not working | Default password is `Admin@1234` (case sensitive). If forgotten, delete `vg_erp.db` and restart (⚠️ loses all data) |
| Can't find data after reinstall | Data is in OneDrive, not in the app. Reinstall → Setup → select same OneDrive folder → data reappears |

---

## BUILD COMMANDS SUMMARY

| Command | What it does |
|---|---|
| `npm install` | Install all dependencies (run once) |
| `npm run dev` | Start in development mode |
| `npm run build` | Build installer + portable .exe |
| `npm run build:portable` | Build portable .exe only (faster) |

---

## SPEC REFERENCE

Full module specifications, database schema, role permissions, document templates,
and development roadmap are in:
**VisionGrroup_ERP_V4_Spec.docx**

---

© 2026 Vision Grroup. All Rights Reserved. Confidential.
