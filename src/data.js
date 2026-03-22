// ─────────────────────────────────────────────────────────────────────────
// Vision Grroup ERP v4.0 — Production Data Store
// All demo data removed. All lists start empty.
// Only system users and entity definitions are pre-set.
// ─────────────────────────────────────────────────────────────────────────

// ── ENTITIES ─────────────────────────────────────────────────────────────
export const ENTITIES = [
  {
    id: 1, code: 'VEH', name: 'Vision Estate Holdings Pvt Ltd',
    gstin: '', pan: '', cin_llpin: '',
    email: '', phone: '',
    address: 'Panvel, Raigad, Maharashtra 410206',
    authorized_signatory: 'Director', designation: 'Director',
  },
  {
    id: 2, code: 'VL', name: 'Vision Lifespaces Pvt Ltd',
    gstin: '', pan: '', cin_llpin: '',
    email: '', phone: '', address: '',
    authorized_signatory: 'Director', designation: 'Director',
  },
  {
    id: 3, code: 'ME', name: 'Mangaldeep Enterprises',
    gstin: '', pan: '', cin_llpin: '',
    email: '', phone: '', address: '',
    authorized_signatory: 'Proprietor', designation: 'Proprietor',
  },
  {
    id: 4, code: 'VU', name: 'Vision Urbansapces LLP',
    gstin: '', pan: '', cin_llpin: '',
    email: '', phone: '', address: '',
    authorized_signatory: 'Partner', designation: 'Partner',
  },
];

// ── USERS ─────────────────────────────────────────────────────────────────
export const USERS = [
  {
    id: 1, username: 'admin', password: 'Admin@1234',
    full_name: 'System Administrator', role: 'super_admin',
    entity_access: [1, 2, 3, 4], email: '', phone: '', is_active: true,
  },
  {
    id: 2, username: 'director', password: 'Director@1234',
    full_name: 'Director', role: 'director',
    entity_access: [1, 2, 3, 4], email: '', phone: '', is_active: true,
  },
{
    id: 3, username: 'accounts', password: 'Acc@1234',
    full_name: 'System Administrator', role: 'super_admin',
    entity_access: [1, 2, 3, 4], email: '', phone: '', is_active: true,
  },
];

// ── ALL LIVE DATA STARTS EMPTY ────────────────────────────────────────────
export const BROKERS       = [];
export const PROJECTS      = [];
export const UNITS         = [];
export const BOOKINGS      = [];
export const VENDORS       = [];
export const LEDGER_ENTRIES = [];
export const EMPLOYEES     = [];

export function buildUnits() { return []; }

// ── NUMBER SERIES — resets per FY automatically ───────────────────────────
export let receiptCounter = 0;
export let demandCounter  = 0;
export let bookingCounter = 0;

function fyString() {
  const y = new Date().getFullYear(), m = new Date().getMonth();
  const s = m >= 3 ? y : y - 1;
  return `${String(s).slice(2)}-${String(s + 1).slice(2)}`;
}

export function nextReceiptNo(code = 'VEH') {
  receiptCounter++;
  return `${code}/${fyString()}/REC/${String(receiptCounter).padStart(3, '0')}`;
}
export function nextDemandNo(code = 'VEH') {
  demandCounter++;
  return `${code}/${fyString()}/DMD/${String(demandCounter).padStart(3, '0')}`;
}
export function nextBookingNo(code = 'VEH') {
  bookingCounter++;
  return `BKG/${code}/${fyString()}/${String(bookingCounter).padStart(3, '0')}`;
}

// ── VALIDATION HELPERS ────────────────────────────────────────────────────
export const VALIDATE = {
  pan:      v => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test((v || '').toUpperCase().trim()),
  phone:    v => /^[6-9]\d{9}$/.test((v || '').trim()),
  email:    v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || '').trim()),
  panMsg:   'PAN format: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F)',
  phoneMsg: 'Enter valid 10-digit mobile number starting with 6-9',
  emailMsg: 'Enter valid email address (e.g. name@domain.com)',
};

// ── GST AUTO-RULE ─────────────────────────────────────────────────────────
export function suggestGSTRate(unitType, agreementValue) {
  if (unitType === 'Shop' || unitType === 'Office') return 5;
  return Number(agreementValue) <= 4500000 ? 1 : 5;
}

// ── ROLE PERMISSIONS ──────────────────────────────────────────────────────
export const ROLE_PERMS = {
  super_admin:      { admin: true,  canRegisterProject: true,  canApproveBooking: true,  canEditProject: true  },
  director:         { admin: true,  canRegisterProject: true,  canApproveBooking: true,  canEditProject: true  },
  accounts_manager: { admin: false, canRegisterProject: false, canApproveBooking: false, canEditProject: false },
  sales_executive:  { admin: false, canRegisterProject: false, canApproveBooking: false, canEditProject: false },
  hr_manager:       { admin: false, canRegisterProject: false, canApproveBooking: false, canEditProject: false },
  broker:           { admin: false, canRegisterProject: false, canApproveBooking: false, canEditProject: false },
  legal_doc_user:   { admin: false, canRegisterProject: false, canApproveBooking: false, canEditProject: false },
};

export function can(user, perm) {
  if (!user) return false;
  return !!(ROLE_PERMS[user.role]?.[perm]);
}
