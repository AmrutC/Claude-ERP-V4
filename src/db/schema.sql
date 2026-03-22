-- ============================================================
-- Vision Grroup ERP v4.0 — Complete SQLite Schema
-- All 45 tables as specified in V4 Specification Pack
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── GROUP 1: FOUNDATION ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS entities (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  code                  TEXT NOT NULL UNIQUE,         -- VEH / VL / ME
  name                  TEXT NOT NULL,
  address               TEXT,
  gstin                 TEXT,
  pan                   TEXT,
  cin_llpin             TEXT,
  logo_path             TEXT,
  email                 TEXT,
  phone                 TEXT,
  authorized_signatory  TEXT,
  designation           TEXT,
  created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by            INTEGER,
  updated_by            INTEGER,
  deleted_at            DATETIME
);

CREATE TABLE IF NOT EXISTS projects (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id               INTEGER NOT NULL REFERENCES entities(id),
  name                    TEXT NOT NULL,
  survey_no               TEXT,
  village                 TEXT,
  taluka                  TEXT,
  district                TEXT,
  pin                     TEXT,
  total_plot_area         REAL,
  total_saleable_area     REAL,
  total_units             INTEGER DEFAULT 0,
  uses_wings              INTEGER DEFAULT 0,          -- 0=No, 1=Yes
  start_date              DATE,
  expected_completion     DATE,
  actual_completion       DATE,
  turnkey_contract_value  REAL,
  turnkey_vendor_id       INTEGER REFERENCES vendors(id),
  status                  TEXT DEFAULT 'Planning',    -- Planning/Under Construction/Completed/On Hold
  -- RERA
  rera_applicable         TEXT DEFAULT 'Yes',         -- Yes / No / Exempt
  rera_exemption_reason   TEXT,                       -- If Exempt
  rera_reg_no             TEXT,
  rera_reg_date           DATE,
  rera_expiry_date        DATE,
  rera_last_update        DATE,
  rera_next_update        DATE,
  rera_promoter_login     TEXT,
  oc_cc_status            TEXT DEFAULT 'Pending',
  notes                   TEXT,
  created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by              INTEGER REFERENCES users(id),
  updated_by              INTEGER REFERENCES users(id),
  deleted_at              DATETIME
);

CREATE TABLE IF NOT EXISTS project_approvals (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id      INTEGER NOT NULL REFERENCES projects(id),
  approval_type   TEXT NOT NULL,  -- NA Order/Layout/Building Plan/Environment/Fire NOC/Water NOC/OC/CC/RERA/Other
  authority       TEXT,
  date_applied    DATE,
  date_received   DATE,
  expiry_date     DATE,
  status          TEXT DEFAULT 'Pending',  -- Pending/Applied/Received/Expired
  doc_reference   TEXT,
  notes           TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by      INTEGER REFERENCES users(id),
  updated_by      INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS wings (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id      INTEGER NOT NULL REFERENCES projects(id),
  name            TEXT NOT NULL,
  total_floors    INTEGER DEFAULT 0,
  units_per_floor INTEGER DEFAULT 0,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at      DATETIME
);

CREATE TABLE IF NOT EXISTS units (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id            INTEGER NOT NULL REFERENCES projects(id),
  wing_id               INTEGER REFERENCES wings(id),
  floor_no              INTEGER DEFAULT 0,
  unit_no               TEXT NOT NULL,
  unit_type             TEXT,     -- 1BHK/2BHK/3BHK/Shop/Office/Parking
  carpet_area           REAL,
  buildup_area          REAL,
  superbuildup_area     REAL,
  base_rate             REAL,
  agreement_value       REAL,
  gst_rate              REAL DEFAULT 5,
  parking_type          TEXT DEFAULT 'None',
  parking_no            TEXT,
  parking_attached_to   INTEGER REFERENCES units(id),
  status                TEXT DEFAULT 'Available',
  floor_plan_path       TEXT,
  notes                 TEXT,
  created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by            INTEGER REFERENCES users(id),
  updated_by            INTEGER REFERENCES users(id),
  deleted_at            DATETIME
);

CREATE TABLE IF NOT EXISTS bank_master (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id     INTEGER NOT NULL REFERENCES entities(id),
  bank_name     TEXT NOT NULL,
  branch        TEXT,
  account_no    TEXT,
  ifsc          TEXT,
  account_type  TEXT,
  is_primary    INTEGER DEFAULT 0,
  opening_cash  REAL DEFAULT 0,
  opening_bank  REAL DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at    DATETIME
);

-- ── GROUP 2: CRM & BOOKING ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id       INTEGER NOT NULL REFERENCES entities(id),
  project_id      INTEGER REFERENCES projects(id),
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  source          TEXT,   -- Walk-in/Referral/Broker/Portal/Social/Other
  interested_in   TEXT,   -- Unit type preference
  budget_min      REAL,
  budget_max      REAL,
  assigned_to     INTEGER REFERENCES users(id),
  broker_id       INTEGER REFERENCES brokers(id),
  status          TEXT DEFAULT 'New',  -- New/Contacted/Site Visit Done/Negotiation/Converted/Lost
  lost_reason     TEXT,
  last_followup   DATE,
  next_followup   DATE,
  notes           TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by      INTEGER REFERENCES users(id),
  deleted_at      DATETIME
);

CREATE TABLE IF NOT EXISTS lead_followups (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id       INTEGER NOT NULL REFERENCES leads(id),
  followup_date DATETIME NOT NULL,
  type          TEXT,   -- Call/Visit/Email/WhatsApp
  notes         TEXT,
  outcome       TEXT,
  next_date     DATE,
  done_by       INTEGER REFERENCES users(id),
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
  id                          INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id                   INTEGER NOT NULL REFERENCES entities(id),
  project_id                  INTEGER NOT NULL REFERENCES projects(id),
  unit_id                     INTEGER NOT NULL REFERENCES units(id),
  lead_id                     INTEGER REFERENCES leads(id),
  booking_no                  TEXT UNIQUE,   -- BKG/VEH/26-27/001
  booking_date                DATE,
  agreement_date              DATE,
  registration_date           DATE,
  possession_date             DATE,
  agreement_value             REAL,
  gst_rate                    REAL DEFAULT 5,
  status                      TEXT DEFAULT 'Booked',
  -- Broker
  broker_id                   INTEGER REFERENCES brokers(id),
  brokerage_amount            REAL DEFAULT 0,
  brokerage_paid              INTEGER DEFAULT 0,
  -- Funding
  funding_type                TEXT DEFAULT 'Own Fund',   -- Own Fund/Home Loan/Mixed
  own_fund_amount             REAL DEFAULT 0,
  loan_amount_requested       REAL DEFAULT 0,
  loan_amount_sanctioned      REAL DEFAULT 0,
  loan_amount_approved        REAL DEFAULT 0,
  loan_amount_disbursed       REAL DEFAULT 0,
  loan_amount_pending         REAL DEFAULT 0,
  loan_bank_name              TEXT,
  loan_branch                 TEXT,
  loan_rm_name                TEXT,
  loan_rm_phone               TEXT,
  loan_account_no             TEXT,
  loan_sanction_date          DATE,
  loan_stage                  TEXT,   -- Applied/Under Process/Sanctioned/Disbursed
  loan_pending_docs           TEXT,   -- JSON array
  kyc_completion_pct          REAL DEFAULT 0,
  -- Cancellation
  cancellation_date           DATE,
  cancellation_reason         TEXT,
  cancellation_deduction_pct  REAL DEFAULT 0,
  cancellation_refund_amount  REAL DEFAULT 0,
  cancellation_approved_by    INTEGER REFERENCES users(id),
  notes                       TEXT,
  created_at                  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at                  DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by                  INTEGER REFERENCES users(id),
  updated_by                  INTEGER REFERENCES users(id),
  deleted_at                  DATETIME
);

CREATE TABLE IF NOT EXISTS allottees (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id       INTEGER NOT NULL REFERENCES bookings(id),
  applicant_order  INTEGER DEFAULT 1,   -- 1=Primary, 2/3=Joint
  name             TEXT NOT NULL,
  pan              TEXT,
  aadhaar          TEXT,                -- Masked XXXX-XXXX-1234
  dob              DATE,
  phone            TEXT,
  email            TEXT,
  address          TEXT,
  occupation       TEXT,
  photo_path       TEXT,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kyc_documents (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id    INTEGER NOT NULL REFERENCES bookings(id),
  allottee_id   INTEGER REFERENCES allottees(id),
  doc_type      TEXT NOT NULL,  -- PAN/Aadhaar/Address Proof/Photo/Income Proof/Bank Statement/Co-PAN/Co-Aadhaar/Other
  status        TEXT DEFAULT 'Pending',  -- Pending/Received/Verified
  received_date DATE,
  doc_path      TEXT,
  notes         TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by    INTEGER REFERENCES users(id)
);

-- ── GROUP 3: PAYMENTS ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS milestone_schedules (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id  INTEGER NOT NULL REFERENCES projects(id),
  name        TEXT NOT NULL,
  is_default  INTEGER DEFAULT 0,
  notes       TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by  INTEGER REFERENCES users(id),
  deleted_at  DATETIME
);

CREATE TABLE IF NOT EXISTS milestone_stages (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id       INTEGER NOT NULL REFERENCES milestone_schedules(id),
  stage_no          INTEGER NOT NULL,
  name              TEXT NOT NULL,
  percentage        REAL NOT NULL,
  typical_due_days  INTEGER DEFAULT 0,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS booking_milestones (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id      INTEGER NOT NULL REFERENCES bookings(id),
  stage_id        INTEGER REFERENCES milestone_stages(id),
  stage_name      TEXT,         -- Copied at creation time
  amount_due      REAL,
  gst_amount      REAL,
  total_demand    REAL,
  demand_date     DATE,
  due_date        DATE,
  demand_no       TEXT,         -- DMD/VEH/26-27/001
  status          TEXT DEFAULT 'Pending',  -- Pending/Demand Issued/Part Paid/Paid/Overdue
  amount_received REAL DEFAULT 0,
  notes           TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by      INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id      INTEGER NOT NULL REFERENCES bookings(id),
  milestone_id    INTEGER NOT NULL REFERENCES booking_milestones(id),
  receipt_no      TEXT UNIQUE,   -- RCP/VEH/26-27/001
  payment_date    DATE NOT NULL,
  amount_received REAL NOT NULL,
  gst_collected   REAL DEFAULT 0,
  total_received  REAL,
  payment_mode    TEXT,   -- Cheque/NEFT/RTGS/UPI/Cash
  cheque_utr_no   TEXT,
  bank_name       TEXT,
  is_advance      INTEGER DEFAULT 0,
  emailed_receipt INTEGER DEFAULT 0,
  emailed_date    DATE,
  notes           TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by      INTEGER REFERENCES users(id)
);

-- ── GROUP 4: FINANCIAL ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ledger_entries (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id             INTEGER NOT NULL REFERENCES entities(id),
  project_id            INTEGER REFERENCES projects(id),
  entry_date            DATE NOT NULL,
  type                  TEXT NOT NULL,   -- Credit / Debit
  category              TEXT,
  description           TEXT,
  amount                REAL NOT NULL,
  linked_payment_id     INTEGER REFERENCES payments(id),
  linked_vendor_bill_id INTEGER REFERENCES vendor_bills(id),
  bank_transaction_id   INTEGER REFERENCES bank_transactions(id),
  created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by            INTEGER REFERENCES users(id),
  deleted_at            DATETIME
);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id       INTEGER NOT NULL REFERENCES entities(id),
  bank_id         INTEGER REFERENCES bank_master(id),
  txn_date        DATE NOT NULL,
  type            TEXT NOT NULL,   -- Receipt / Payment
  mode            TEXT,
  particulars     TEXT,
  voucher_no      TEXT,
  cash_amount     REAL DEFAULT 0,
  bank_amount     REAL DEFAULT 0,
  is_reconciled   INTEGER DEFAULT 0,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by      INTEGER REFERENCES users(id),
  deleted_at      DATETIME
);

CREATE TABLE IF NOT EXISTS budget_heads (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id       INTEGER NOT NULL REFERENCES projects(id),
  head_name        TEXT NOT NULL,
  budgeted_amount  REAL DEFAULT 0,
  notes            TEXT,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── GROUP 5: HR, BROKERAGE, VENDOR ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS departments (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS designations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  department_id   INTEGER REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS employees (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id       INTEGER NOT NULL REFERENCES entities(id),
  emp_code        TEXT UNIQUE,
  name            TEXT NOT NULL,
  designation_id  INTEGER REFERENCES designations(id),
  department_id   INTEGER REFERENCES departments(id),
  doj             DATE,
  dol             DATE,
  monthly_salary  REAL DEFAULT 0,
  pan             TEXT,
  aadhaar         TEXT,
  bank_account    TEXT,
  bank_ifsc       TEXT,
  status          TEXT DEFAULT 'Active',
  photo_path      TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by      INTEGER REFERENCES users(id),
  deleted_at      DATETIME
);

CREATE TABLE IF NOT EXISTS attendance (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  att_date    DATE NOT NULL,
  status      TEXT DEFAULT 'Present',   -- Present/Absent/Half Day/Leave/Holiday
  in_time     TEXT,
  out_time    TEXT,
  notes       TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by  INTEGER REFERENCES users(id),
  UNIQUE(employee_id, att_date)
);

CREATE TABLE IF NOT EXISTS payroll (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id     INTEGER NOT NULL REFERENCES employees(id),
  month           TEXT NOT NULL,   -- YYYY-MM
  working_days    REAL DEFAULT 26,
  present_days    REAL DEFAULT 0,
  half_days       REAL DEFAULT 0,
  gross_salary    REAL DEFAULT 0,
  deductions      REAL DEFAULT 0,
  net_salary      REAL DEFAULT 0,
  paid_date       DATE,
  payment_mode    TEXT,
  status          TEXT DEFAULT 'Draft',  -- Draft/Approved/Paid
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by      INTEGER REFERENCES users(id),
  UNIQUE(employee_id, month)
);

CREATE TABLE IF NOT EXISTS leave_applications (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id   INTEGER NOT NULL REFERENCES employees(id),
  leave_type    TEXT,   -- Casual/Sick/Earned/Unpaid
  from_date     DATE,
  to_date       DATE,
  days          REAL,
  reason        TEXT,
  status        TEXT DEFAULT 'Pending',   -- Pending/Approved/Rejected
  approved_by   INTEGER REFERENCES users(id),
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS brokers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_name       TEXT,
  contact_person  TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  gstin           TEXT,
  pan             TEXT,
  rera_no         TEXT,
  tds_rate        REAL DEFAULT 5,
  tds_exemption   INTEGER DEFAULT 0,
  user_id         INTEGER REFERENCES users(id),
  status          TEXT DEFAULT 'Active',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by      INTEGER REFERENCES users(id),
  deleted_at      DATETIME
);

CREATE TABLE IF NOT EXISTS broker_project_mapping (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  broker_id   INTEGER NOT NULL REFERENCES brokers(id),
  project_id  INTEGER NOT NULL REFERENCES projects(id),
  brokerage_pct   REAL DEFAULT 0,
  is_active   INTEGER DEFAULT 1,
  UNIQUE(broker_id, project_id)
);

CREATE TABLE IF NOT EXISTS brokerage_payouts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  broker_id     INTEGER NOT NULL REFERENCES brokers(id),
  booking_id    INTEGER NOT NULL REFERENCES bookings(id),
  gross_amount  REAL,
  tds_amount    REAL,
  net_payable   REAL,
  paid_amount   REAL DEFAULT 0,
  paid_date     DATE,
  payment_mode  TEXT,
  status        TEXT DEFAULT 'Pending',   -- Pending/Partially Paid/Paid
  notes         TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by    INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS vendors (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id       INTEGER NOT NULL REFERENCES entities(id),
  name            TEXT NOT NULL,
  type            TEXT,   -- Turnkey Contractor/Architect/Structural Engineer/MEP/Supplier/Labour Contractor/Other
  phone           TEXT,
  email           TEXT,
  gstin           TEXT,
  pan             TEXT,
  contract_value  REAL DEFAULT 0,
  status          TEXT DEFAULT 'Active',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by      INTEGER REFERENCES users(id),
  deleted_at      DATETIME
);

CREATE TABLE IF NOT EXISTS vendor_bills (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_id     INTEGER NOT NULL REFERENCES vendors(id),
  project_id    INTEGER REFERENCES projects(id),
  invoice_no    TEXT,
  invoice_date  DATE,
  description   TEXT,
  bill_amount   REAL,
  gst_on_bill   REAL DEFAULT 0,
  total_bill    REAL,
  paid_amount   REAL DEFAULT 0,
  status        TEXT DEFAULT 'Unpaid',   -- Unpaid/Part Paid/Paid
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by    INTEGER REFERENCES users(id)
);

-- ── GROUP 6: SYSTEM ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  username        TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  role            TEXT NOT NULL,   -- super_admin/director/accounts_manager/sales_executive/hr_manager/broker/legal_doc_user
  entity_access   TEXT DEFAULT '[]',   -- JSON array of entity IDs
  is_active       INTEGER DEFAULT 1,
  last_login      DATETIME,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at      DATETIME
);

CREATE TABLE IF NOT EXISTS audit_log (
  -- IMMUTABLE: No UPDATE or DELETE ever on this table
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp     DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id       INTEGER REFERENCES users(id),
  entity_id     INTEGER REFERENCES entities(id),
  module        TEXT,
  event_type    TEXT,   -- CREATE/UPDATE/DELETE/LOGIN/LOGOUT/DOCUMENT/EXPORT/SETTINGS
  record_ref    TEXT,
  field_changed TEXT,
  old_value     TEXT,
  new_value     TEXT,
  ip_address    TEXT,
  device_name   TEXT
);

CREATE TABLE IF NOT EXISTS document_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_type        TEXT,   -- BKG/ALT/DMD/RCP/AGR/POS/NOC/CXL
  doc_no          TEXT,
  booking_id      INTEGER REFERENCES bookings(id),
  generated_by    INTEGER REFERENCES users(id),
  generated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  emailed         INTEGER DEFAULT 0,
  email_sent_to   TEXT,
  whatsapp_shared INTEGER DEFAULT 0,
  file_path       TEXT
);

CREATE TABLE IF NOT EXISTS number_series (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id       INTEGER NOT NULL REFERENCES entities(id),
  doc_type        TEXT NOT NULL,   -- BKG/ALT/DMD/RCP/AGR/POS/NOC/CXL
  financial_year  TEXT NOT NULL,   -- 26-27
  last_number     INTEGER DEFAULT 0,
  prefix          TEXT,            -- e.g. RCP/VEH
  UNIQUE(entity_id, doc_type, financial_year)
);

CREATE TABLE IF NOT EXISTS app_settings (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  key     TEXT NOT NULL UNIQUE,
  value   TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS email_templates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_type    TEXT NOT NULL UNIQUE,
  subject     TEXT,
  body_html   TEXT,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by  INTEGER REFERENCES users(id)
);

-- ── DEFAULT DATA ──────────────────────────────────────────────────────────

-- Default Super Admin (password: Admin@1234 — CHANGE IMMEDIATELY)
INSERT OR IGNORE INTO users (username, password_hash, full_name, role, entity_access)
VALUES ('admin', '$2b$10$defaulthashchangeme', 'System Administrator', 'super_admin', '[1,2,3]');

-- Default Entities
INSERT OR IGNORE INTO entities (code, name, authorized_signatory, designation)
VALUES 
  ('VEH', 'Vision Estate Holdings Pvt Ltd', 'Director', 'Director'),
  ('VL',  'Vision Lifespaces Pvt Ltd',      'Director', 'Director'),
  ('ME',  'Mangaldeep Enterprises',          'Proprietor', 'Proprietor');

-- Default Departments
INSERT OR IGNORE INTO departments (name) VALUES 
  ('Management'),('Sales'),('Accounts'),('Legal'),('HR'),('Admin'),('Operations');

-- Default Number Series for current FY
INSERT OR IGNORE INTO number_series (entity_id, doc_type, financial_year, prefix) 
SELECT e.id, d.type, '26-27', d.type || '/' || e.code
FROM entities e
CROSS JOIN (
  SELECT 'BKG' as type UNION SELECT 'ALT' UNION SELECT 'DMD' 
  UNION SELECT 'RCP' UNION SELECT 'AGR' UNION SELECT 'POS' 
  UNION SELECT 'NOC' UNION SELECT 'CXL'
) d;

-- Default App Settings
INSERT OR IGNORE INTO app_settings (key, value) VALUES
  ('company_name', 'Vision Grroup'),
  ('default_gst_rate', '5'),
  ('tds_brokerage_rate', '5'),
  ('working_days_per_month', '26'),
  ('smtp_host', 'smtp.office365.com'),
  ('smtp_port', '587'),
  ('smtp_user', ''),
  ('smtp_pass', ''),
  ('smtp_from_name', 'Vision Grroup ERP'),
  ('smtp_from_email', '');

-- ── INDEXES ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_units_project    ON units(project_id);
CREATE INDEX IF NOT EXISTS idx_units_status     ON units(status);
CREATE INDEX IF NOT EXISTS idx_bookings_unit    ON bookings(unit_id);
CREATE INDEX IF NOT EXISTS idx_bookings_entity  ON bookings(entity_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entity    ON ledger_entries(entity_id);
CREATE INDEX IF NOT EXISTS idx_ledger_date      ON ledger_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_audit_user       ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp  ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_leads_assigned   ON leads(assigned_to);
