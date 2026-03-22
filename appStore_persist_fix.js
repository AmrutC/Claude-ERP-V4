import { create } from 'zustand';

// ── isSQLiteAvailable ─────────────────────────────────────────────────────
const isSQLite = () => typeof window !== 'undefined' && !!window.vgERP?.db?.saveTable;

// ── PERSIST to SQLite (fire-and-forget, non-blocking) ─────────────────────
function persist(key, data, entityId = 0) {
  if (!isSQLite()) return;
  window.vgERP.db.saveTable(key, data, entityId).catch(e => {
    console.warn(`[DB] Failed to persist ${key}:`, e);
  });
}

// ── applyUpdate: supports both direct value and functional updater ─────────
function applyUpdate(current, arg) {
  if (Array.isArray(arg)) return arg;
  if (typeof arg === 'function') {
    const result = arg(Array.isArray(current) ? current : []);
    return Array.isArray(result) ? result : [];
  }
  return Array.isArray(current) ? current : [];
}

export const useAppStore = create((set, get) => ({

  // ── AUTH ──────────────────────────────────────────────────────────────
  user:       null,
  setUser:    (user) => set({ user }),
  logout:     () => set({
    user:null, activeEntity:null, activeModule:'dashboard',
    activeProject:null, pendingBookingUnit:null,
  }),

  // ── ENTITY — locked at login ──────────────────────────────────────────
  activeEntity:      null,
  setActiveEntity:   (entity) => set({ activeEntity: entity }),
  availableEntities: [],
  setAvailableEntities: (list) => set({ availableEntities: list }),

  // ── CROSS-MODULE STATE ────────────────────────────────────────────────
  pendingBookingUnit:    null,
  setPendingBookingUnit: (unit) => set({ pendingBookingUnit: unit }),
  activeProject:    null,
  setActiveProject: (project) => set({ activeProject: project }),

  // ── NAVIGATION ────────────────────────────────────────────────────────
  activeModule:    'dashboard',
  setActiveModule: (mod) => set({ activeModule: mod }),

  // ── DATA LOADING STATE ────────────────────────────────────────────────
  dataLoaded: false,
  setDataLoaded: (v) => set({ dataLoaded: v }),

  // ── SHARED DATA — auto-persists to SQLite on every write ──────────────

  projects: [],
  setProjects: (arg) => set(s => {
    const data = applyUpdate(s.projects, arg);
    persist('projects', data, s.activeEntity?.id || 0);
    return { projects: data };
  }),

  // Users — persisted globally (entity_id=0 so all entities see them)
  users: [],
  setUsers: (arg) => set(s => {
    const data = applyUpdate(s.users, arg);
    persist('users', data, 0);
    return { users: data };
  }),

  bookings: [],
  setBookings: (arg) => set(s => {
    const data = applyUpdate(s.bookings, arg);
    persist('bookings', data, s.activeEntity?.id || 0);
    return { bookings: data };
  }),

  vendors: [],
  setVendors: (arg) => set(s => {
    const data = applyUpdate(s.vendors, arg);
    persist('vendors', data, s.activeEntity?.id || 0);
    return { vendors: data };
  }),

  brokers: [],
  setBrokers: (arg) => set(s => {
    const data = applyUpdate(s.brokers, arg);
    persist('brokers', data, s.activeEntity?.id || 0);
    return { brokers: data };
  }),

  employees: [],
  setEmployees: (arg) => set(s => {
    const data = applyUpdate(s.employees, arg);
    persist('employees', data, s.activeEntity?.id || 0);
    return { employees: data };
  }),

  ledgerEntries: [],
  setLedgerEntries: (arg) => set(s => {
    const data = applyUpdate(s.ledgerEntries, arg);
    persist('ledgerEntries', data, s.activeEntity?.id || 0);
    return { ledgerEntries: data };
  }),

  // Extra collections
  crmLeads: [],
  setCrmLeads: (arg) => set(s => {
    const data = applyUpdate(s.crmLeads, arg);
    persist('crmLeads', data, s.activeEntity?.id || 0);
    return { crmLeads: data };
  }),

  // ── LOAD ALL DATA FROM SQLITE ──────────────────────────────────────────
  async loadFromDB(entityId) {
    // Always mark loaded — don't leave app stuck on spinner
    if (!isSQLite()) {
      console.warn('[Store] SQLite not available — running in-memory only');
      set({ dataLoaded: true });
      return;
    }
    try {
      console.log('[Store] Loading data for entity', entityId);
      const res = await window.vgERP.db.loadAll(entityId);
      if (res.ok && res.data) {
        const d = res.data;
        console.log('[Store] Loaded keys:', Object.keys(d));
        set({
          projects:     Array.isArray(d.projects)     ? d.projects     : [],
          bookings:     Array.isArray(d.bookings)     ? d.bookings     : [],
          vendors:      Array.isArray(d.vendors)      ? d.vendors      : [],
          brokers:      Array.isArray(d.brokers)      ? d.brokers      : [],
          employees:    Array.isArray(d.employees)    ? d.employees    : [],
          ledgerEntries:Array.isArray(d.ledgerEntries)? d.ledgerEntries: [],
          crmLeads:     Array.isArray(d.crmLeads)     ? d.crmLeads     : [],
          users:        Array.isArray(d.users)        ? d.users        : [],
          dataLoaded: true,
        });
        console.log('[Store] Projects loaded:', Array.isArray(d.projects) ? d.projects.length : 0);
      } else {
        console.warn('[Store] loadAll returned:', res);
        set({ dataLoaded: true });
      }
    } catch (e) {
      console.error('[Store] loadFromDB failed:', e);
      set({ dataLoaded: true });
    }
  },

  // ── ONEDRIVE ──────────────────────────────────────────────────────────
  oneDrivePath:    null,
  setOneDrivePath: (p) => set({ oneDrivePath: p }),

  // ── TOAST ─────────────────────────────────────────────────────────────
  toasts:   [],
  addToast: (msg, type='success') => {
    const id = Date.now();
    set(s => ({ toasts: [...s.toasts, { id, msg, type }] }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 3800);
  },
}));

// ── ROLE LABELS ───────────────────────────────────────────────────────────
export const ROLE_LABELS = {
  super_admin:      'Super Admin',
  director:         'Director',
  accounts_manager: 'Accounts Manager',
  sales_executive:  'Sales Executive',
  hr_manager:       'HR Manager',
  broker:           'Broker',
  legal_doc_user:   'Legal / Doc User',
};

// ── NAV CONFIG ────────────────────────────────────────────────────────────
export const NAV_CONFIG = {
  super_admin:      ['dashboard','crm','inventory','bookings','payments','documents','accounts','gst','hr','brokerage','vendors','mis','audit','communication','admin'],
  director:         ['dashboard','crm','inventory','bookings','payments','documents','accounts','gst','hr','brokerage','vendors','mis','audit','communication','admin'],
  accounts_manager: ['dashboard','bookings','payments','accounts','gst','vendors','mis'],
  sales_executive:  ['dashboard','crm','inventory','bookings'],
  hr_manager:       ['dashboard','hr'],
  broker:           ['dashboard','inventory','bookings'],
  legal_doc_user:   ['dashboard','crm','inventory','bookings','documents'],
};

export function getNavItems(role) {
  return NAV_CONFIG[role] || ['dashboard'];
}
