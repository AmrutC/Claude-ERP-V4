/**
 * Vision Grroup ERP — Database Client
 * Wraps better-sqlite3 with helpers for all modules.
 * Runs in the Electron main process via IPC — or directly in Node context.
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

let db = null;

function getDB(dbPath) {
  if (db) return db;
  const schemaPath = path.join(__dirname, 'schema.sql');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  return db;
}

// ── AUDIT HELPER ─────────────────────────────────────────────────────────
function audit(db, { userId, entityId, module, event, ref, field, oldVal, newVal }) {
  db.prepare(`INSERT INTO audit_log 
    (user_id,entity_id,module,event_type,record_ref,field_changed,old_value,new_value)
    VALUES (?,?,?,?,?,?,?,?)`
  ).run(userId, entityId, module, event, ref, field||null, oldVal||null, newVal||null);
}

// ── NUMBER SERIES ─────────────────────────────────────────────────────────
function nextDocNo(db, entityId, docType) {
  const now = new Date();
  const month = now.getMonth(); // 0=Jan, 3=Apr
  const year = now.getFullYear();
  const fyStart = month >= 3 ? year : year - 1;
  const fy = `${String(fyStart).slice(2)}-${String(fyStart + 1).slice(2)}`;

  const entityCode = db.prepare('SELECT code FROM entities WHERE id=?').get(entityId)?.code || 'VEH';
  const prefix = `${docType}/${entityCode}/${fy}`;

  const row = db.prepare(
    'SELECT * FROM number_series WHERE entity_id=? AND doc_type=? AND financial_year=?'
  ).get(entityId, docType, fy);

  if (!row) {
    db.prepare(
      'INSERT INTO number_series (entity_id, doc_type, financial_year, last_number, prefix) VALUES (?,?,?,1,?)'
    ).run(entityId, docType, fy, prefix);
    return `${prefix}/001`;
  }

  const next = (row.last_number || 0) + 1;
  db.prepare('UPDATE number_series SET last_number=? WHERE id=?').run(next, row.id);
  return `${prefix}/${String(next).padStart(3, '0')}`;
}

// ── AUTH ──────────────────────────────────────────────────────────────────
function login(db, username, password) {
  const user = db.prepare('SELECT * FROM users WHERE username=? AND deleted_at IS NULL').get(username);
  if (!user || !user.is_active) return null;
  // For first-run admin with placeholder hash, allow 'Admin@1234'
  const isDefault = user.password_hash === '$2b$10$defaulthashchangeme' && password === 'Admin@1234';
  const valid = isDefault || bcrypt.compareSync(password, user.password_hash);
  if (!valid) return null;
  db.prepare('UPDATE users SET last_login=CURRENT_TIMESTAMP WHERE id=?').run(user.id);
  audit(db, { userId: user.id, module: 'auth', event: 'LOGIN', ref: user.username });
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

function changePassword(db, userId, newPassword) {
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(hash, userId);
}

// ── UNITS / INVENTORY ─────────────────────────────────────────────────────
function getInventoryMap(db, projectId) {
  return db.prepare(`
    SELECT u.*, w.name as wing_name,
           b.id as booking_id, b.booking_no,
           a.name as allottee_name
    FROM units u
    LEFT JOIN wings w ON u.wing_id = w.id
    LEFT JOIN bookings b ON b.unit_id = u.id AND b.deleted_at IS NULL AND b.status != 'Cancelled'
    LEFT JOIN allottees a ON a.booking_id = b.id AND a.applicant_order = 1
    WHERE u.project_id = ? AND u.deleted_at IS NULL
    ORDER BY u.wing_id, u.floor_no DESC, u.unit_no
  `).all(projectId);
}

// ── MILESTONES ────────────────────────────────────────────────────────────
function createMilestonesFromSchedule(db, bookingId, scheduleId, agreementValue, gstRate) {
  const stages = db.prepare('SELECT * FROM milestone_stages WHERE schedule_id=? ORDER BY stage_no').all(scheduleId);
  const insert = db.prepare(`
    INSERT INTO booking_milestones (booking_id, stage_id, stage_name, amount_due, gst_amount, total_demand, status)
    VALUES (?,?,?,?,?,?,'Pending')`);
  stages.forEach(s => {
    const base = Math.round(agreementValue * s.percentage / 100);
    const gst = Math.round(base * gstRate / (100 + gstRate)); // reverse-calc for composite
    insert.run(bookingId, s.id, s.name, base, gst, base + gst);
  });
}

// ── OVERDUE UPDATE ────────────────────────────────────────────────────────
function updateOverdueMilestones(db) {
  const today = new Date().toISOString().slice(0, 10);
  db.prepare(`
    UPDATE booking_milestones SET status='Overdue'
    WHERE due_date < ? AND status IN ('Demand Issued','Part Paid')
  `).run(today);
}

// ── REPORTS ──────────────────────────────────────────────────────────────
function getCollectionSummary(db, entityId, projectId = null) {
  const where = projectId ? 'AND b.project_id=?' : '';
  const params = projectId ? [entityId, projectId] : [entityId];
  return db.prepare(`
    SELECT 
      COUNT(DISTINCT b.id) as total_bookings,
      SUM(b.agreement_value) as total_agreement,
      SUM(p.total_received) as total_collected,
      SUM(b.agreement_value) - SUM(COALESCE(p.total_received,0)) as balance
    FROM bookings b
    LEFT JOIN (SELECT booking_id, SUM(total_received) as total_received FROM payments GROUP BY booking_id) p
      ON p.booking_id = b.id
    WHERE b.entity_id=? AND b.deleted_at IS NULL AND b.status != 'Cancelled' ${where}
  `).get(...params);
}

function getGSTSummary(db, entityId, month) {
  return db.prepare(`
    SELECT 
      SUM(p.amount_received) as base_amount,
      SUM(p.gst_collected) as gst_collected,
      b.gst_rate,
      COUNT(*) as txn_count
    FROM payments p
    JOIN bookings b ON b.id = p.booking_id
    WHERE b.entity_id=? AND strftime('%Y-%m', p.payment_date)=?
    GROUP BY b.gst_rate
  `).all(entityId, month);
}

function getOverdueDemands(db, entityId) {
  return db.prepare(`
    SELECT bm.*, b.booking_no, b.agreement_value,
           a.name as allottee_name, a.phone,
           u.unit_no, p.name as project_name
    FROM booking_milestones bm
    JOIN bookings b ON b.id = bm.booking_id
    JOIN units u ON u.id = b.unit_id
    JOIN projects p ON p.id = b.project_id
    JOIN allottees a ON a.booking_id = b.id AND a.applicant_order = 1
    WHERE b.entity_id=? AND bm.status IN ('Overdue','Part Paid')
    ORDER BY bm.due_date
  `).all(entityId);
}

function getDashboardKPIs(db, entityId) {
  const today = new Date().toISOString().slice(0,10);
  const monthStart = today.slice(0,7) + '-01';
  
  const units = db.prepare(`
    SELECT status, COUNT(*) as cnt FROM units u
    JOIN projects p ON p.id = u.project_id
    WHERE p.entity_id=? AND u.deleted_at IS NULL
    GROUP BY status`).all(entityId);

  const collections = db.prepare(`
    SELECT SUM(p.total_received) as mtd
    FROM payments p JOIN bookings b ON b.id=p.booking_id
    WHERE b.entity_id=? AND p.payment_date >= ?`).get(entityId, monthStart);

  const overdues = db.prepare(`
    SELECT COUNT(*) as cnt FROM booking_milestones bm
    JOIN bookings b ON b.id=bm.booking_id
    WHERE b.entity_id=? AND bm.status IN ('Overdue','Part Paid')`).get(entityId);

  const gstLiability = db.prepare(`
    SELECT SUM(gst_collected) as total FROM payments p
    JOIN bookings b ON b.id=p.booking_id
    WHERE b.entity_id=? AND strftime('%Y-%m',p.payment_date)=?`).get(entityId, today.slice(0,7));

  const bankBal = db.prepare(`
    SELECT (COALESCE(bm.ob,0) + COALESCE(r.total,0) - COALESCE(pmt.total,0)) as balance
    FROM (SELECT SUM(opening_bank) as ob FROM bank_master WHERE entity_id=?) bm,
         (SELECT SUM(bank_amount) as total FROM bank_transactions WHERE entity_id=? AND type='Receipt') r,
         (SELECT SUM(bank_amount) as total FROM bank_transactions WHERE entity_id=? AND type='Payment') pmt`
  ).get(entityId, entityId, entityId);

  const vendorDues = db.prepare(`
    SELECT SUM(total_bill - paid_amount) as dues FROM vendor_bills vb
    JOIN vendors v ON v.id=vb.vendor_id WHERE v.entity_id=? AND vb.status != 'Paid'`).get(entityId);

  return { units, collections, overdues, gstLiability, bankBal, vendorDues };
}

module.exports = { getDB, audit, nextDocNo, login, changePassword, getInventoryMap, createMilestonesFromSchedule, updateOverdueMilestones, getCollectionSummary, getGSTSummary, getOverdueDemands, getDashboardKPIs };
