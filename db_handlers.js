/**
 * Vision Grroup ERP — SQLite IPC Handlers
 * Fixed: app_store primary key is now (key + entity_id) composite
 */

const path = require('path');
const bcrypt = require('bcryptjs');
const { getDB } = require('./src/db/client');

function ensureAppStore(db) {
  // Drop old single-key table and recreate with composite primary key
  // Only recreates if the old schema (key only) is detected
  const tableInfo = db.prepare("PRAGMA table_info(app_store)").all();
  const hasPK = tableInfo.some(col => col.pk === 1);
  
  // Check if we have the composite PK version already
  const indexList = db.prepare("PRAGMA index_list(app_store)").all();
  const hasComposite = db.prepare(
    "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='app_store' AND sql LIKE '%PRIMARY KEY%key%entity_id%'"
  ).get()?.cnt > 0;

  if (!hasComposite) {
    // Migrate: rename old table, create new, copy data
    db.exec(`
      BEGIN;
      ALTER TABLE app_store RENAME TO app_store_old;
      CREATE TABLE app_store (
        key        TEXT    NOT NULL,
        entity_id  INTEGER NOT NULL DEFAULT 0,
        value      TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (key, entity_id)
      );
      INSERT OR IGNORE INTO app_store (key, entity_id, value, updated_at)
        SELECT key, COALESCE(entity_id, 0), value, updated_at FROM app_store_old;
      DROP TABLE app_store_old;
      COMMIT;
    `);
  }
}

function openDB(getDataDir) {
  const dbPath = path.join(getDataDir(), 'vg_erp.db');
  const db = getDB(dbPath);
  ensureAppStore(db);
  return db;
}

module.exports = function registerDBHandlers(ipcMain, getDataDir, app) {

  // ── LOAD ALL DATA FOR AN ENTITY ──────────────────────────────────────
  ipcMain.handle('db:loadAll', (event, entityId = 0) => {
    try {
      const db = openDB(getDataDir);
      // Load entity-specific data AND entity_id=0 (global) data
      const rows = db.prepare(
        'SELECT key, value, entity_id FROM app_store WHERE entity_id=? OR entity_id=0 ORDER BY entity_id DESC'
      ).all(entityId);
      
      // entity-specific rows override global (entity_id=0) rows for same key
      const seen = new Set();
      const result = {};
      rows.forEach(r => {
        if (!seen.has(r.key)) {
          seen.add(r.key);
          try { result[r.key] = JSON.parse(r.value); }
          catch { result[r.key] = null; }
        }
      });

      console.log('[DB] loadAll entity', entityId, '→ keys:', Object.keys(result));
      return { ok: true, data: result };
    } catch (err) {
      console.error('[DB] loadAll error:', err.message);
      return { ok: false, error: err.message };
    }
  });

  // ── SAVE A SINGLE TABLE ──────────────────────────────────────────────
  ipcMain.handle('db:saveTable', (event, { key, data, entityId = 0 }) => {
    try {
      const db = openDB(getDataDir);
      const json = JSON.stringify(data);
      db.prepare(`
        INSERT INTO app_store (key, entity_id, value, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key, entity_id) DO UPDATE
          SET value=excluded.value, updated_at=CURRENT_TIMESTAMP
      `).run(key, entityId, json);
      console.log('[DB] saved', key, 'entity', entityId, 'rows:', Array.isArray(data) ? data.length : 1);
      return { ok: true };
    } catch (err) {
      console.error('[DB] saveTable error:', err.message);
      return { ok: false, error: err.message };
    }
  });

  // ── AUTH: LOGIN ──────────────────────────────────────────────────────
  ipcMain.handle('db:login', (event, { username, password }) => {
    try {
      const db = openDB(getDataDir);
      
      // Try structured users table first
      const user = db.prepare(
        'SELECT * FROM users WHERE username=? AND deleted_at IS NULL'
      ).get(username);

      if (!user) {
        // Fallback: app_store users blob
        const stored = db.prepare("SELECT value FROM app_store WHERE key='users'").get();
        if (stored) {
          const users = JSON.parse(stored.value);
          const found = users?.find(u => u.username === username && u.password === password);
          if (found) {
            const { password: _, ...safe } = found;
            return { ok: true, user: safe };
          }
        }
        return { ok: false, error: 'Invalid credentials' };
      }

      if (!user.is_active) return { ok: false, error: 'Account inactive' };

      const plainMatch   = password === user.password_hash;
      const defaultMatch = user.password_hash === '$2b$10$defaulthashchangeme' && password === 'Admin@1234';
      let bcryptMatch = false;
      if (!plainMatch && !defaultMatch) {
        try { bcryptMatch = bcrypt.compareSync(password, user.password_hash); } catch {}
      }

      if (!plainMatch && !defaultMatch && !bcryptMatch) {
        return { ok: false, error: 'Invalid credentials' };
      }

      db.prepare('UPDATE users SET last_login=CURRENT_TIMESTAMP WHERE id=?').run(user.id);
      const { password_hash, ...safeUser } = user;
      try { safeUser.entity_access = JSON.parse(safeUser.entity_access || '[1,2,3]'); }
      catch { safeUser.entity_access = [1,2,3]; }

      return { ok: true, user: safeUser };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // ── CHANGE PASSWORD ──────────────────────────────────────────────────
  ipcMain.handle('db:changePassword', (event, { userId, newPassword }) => {
    try {
      const db = openDB(getDataDir);
      const hash = bcrypt.hashSync(newPassword, 10);
      db.prepare('UPDATE users SET password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(hash, userId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // ── SETTINGS ────────────────────────────────────────────────────────
  ipcMain.handle('db:getSetting', (event, key) => {
    try {
      const db = openDB(getDataDir);
      const row = db.prepare('SELECT value FROM app_settings WHERE key=?').get(key);
      return { ok: true, value: row?.value ?? null };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('db:setSetting', (event, { key, value }) => {
    try {
      const db = openDB(getDataDir);
      db.prepare(`
        INSERT INTO app_settings (key, value, updated_at) VALUES (?,?,CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP
      `).run(key, String(value));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // ── AUDIT LOG ────────────────────────────────────────────────────────
  ipcMain.handle('db:auditLog', (event, { userId, entityId, module, event: evt, ref, field, oldVal, newVal }) => {
    try {
      const db = openDB(getDataDir);
      db.prepare(`
        INSERT INTO audit_log (user_id,entity_id,module,event_type,record_ref,field_changed,old_value,new_value)
        VALUES (?,?,?,?,?,?,?,?)
      `).run(userId||null, entityId||null, module||'', evt||'', ref||'', field||null, oldVal||null, newVal||null);
      return { ok: true };
    } catch { return { ok: true }; }
  });

  ipcMain.handle('db:getAuditLog', (event, { entityId, limit = 200 }) => {
    try {
      const db = openDB(getDataDir);
      const rows = db.prepare(`
        SELECT al.*, u.full_name as user_name FROM audit_log al
        LEFT JOIN users u ON u.id = al.user_id
        WHERE al.entity_id=? OR al.entity_id IS NULL
        ORDER BY al.timestamp DESC LIMIT ?
      `).all(entityId, limit);
      return { ok: true, data: rows };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // ── DB INFO ──────────────────────────────────────────────────────────
  ipcMain.handle('db:info', () => {
    try {
      const db = openDB(getDataDir);
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      const storeRows = db.prepare('SELECT key, entity_id, length(value) as bytes, updated_at FROM app_store ORDER BY entity_id, key').all();
      return { ok: true, tables: tables.map(t=>t.name), storeKeys: storeRows };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
};
