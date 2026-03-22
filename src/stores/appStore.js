import { create } from 'zustand';

// ── Default seed entities ──────────────────────────────────────────────────
const SEED_ENTITIES = [
  { id:1, code:'VEH', name:'Vision Estate Holdings Pvt Ltd', gstin:'', pan:'', cin_llpin:'', email:'', phone:'', address:'Panvel, Raigad, Maharashtra 410206', authorized_signatory:'Director', designation:'Director' },
  { id:2, code:'VL',  name:'Vision Lifespaces Pvt Ltd',      gstin:'', pan:'', cin_llpin:'', email:'', phone:'', address:'', authorized_signatory:'Director', designation:'Director' },
  { id:3, code:'ME',  name:'Mangaldeep Enterprises',          gstin:'', pan:'', cin_llpin:'', email:'', phone:'', address:'', authorized_signatory:'Proprietor', designation:'Proprietor' },
];

// ── Is Electron available? ─────────────────────────────────────────────────
const isElectron = () => typeof window !== 'undefined' && !!window.vgERP?.data?.save;

// ── Save GLOBAL data (entities + users) ───────────────────────────────────
// Called whenever entities or users change — writes vg_global.json
let globalSaveTimer = null;
function saveGlobal(getState) {
  if (!isElectron()) return;
  clearTimeout(globalSaveTimer);
  globalSaveTimer = setTimeout(() => {
    const s = getState();
    const payload = {
      entities:  s.entities,
      users:     s.users,
      savedAt:   new Date().toISOString(),
    };
    window.vgERP.data.saveGlobal(payload)
      .then(r => {
        if (r.ok) console.log('[Store] ✓ Saved vg_global.json — entities:', (s.entities||[]).length, 'users:', (s.users||[]).length);
        else      console.error('[Store] ✗ saveGlobal failed:', r.error);
      })
      .catch(e => console.error('[Store] saveGlobal error:', e));
  }, 300);
}

// ── Save ENTITY data (projects, bookings, vendors etc.) ────────────────────
// Called whenever entity-specific data changes — writes vg_data_VEH.json etc.
let entitySaveTimer = null;
function saveEntityData(getState) {
  if (!isElectron()) return;
  clearTimeout(entitySaveTimer);
  entitySaveTimer = setTimeout(() => {
    const s = getState();
    const code = s.activeEntity?.code;
    if (!code) {
      console.warn('[Store] saveEntityData: no active entity — skipping save');
      return;
    }
    const payload = {
      projects:      s.projects,
      bookings:      s.bookings,
      vendors:       s.vendors,
      brokers:       s.brokers,
      employees:     s.employees,
      ledgerEntries: s.ledgerEntries,
      crmLeads:      s.crmLeads,
      savedAt:       new Date().toISOString(),
      entityCode:    code,
    };
    window.vgERP.data.save(code, payload)
      .then(r => {
        if (r.ok) console.log('[Store] ✓ Saved vg_data_' + code + '.json — projects:', (s.projects||[]).length, 'bookings:', (s.bookings||[]).length);
        else      console.error('[Store] ✗ save failed:', r.error);
      })
      .catch(e => console.error('[Store] save error:', e));
  }, 400);
}

// ── applyUpdate helper ─────────────────────────────────────────────────────
function applyUpdate(current, arg) {
  if (Array.isArray(arg)) return arg;
  if (typeof arg === 'function') {
    const result = arg(Array.isArray(current) ? current : []);
    return Array.isArray(result) ? result : [];
  }
  return Array.isArray(current) ? current : [];
}

// ── STORE ──────────────────────────────────────────────────────────────────
export const useAppStore = create((set, get) => ({

  // ── AUTH ──────────────────────────────────────────────────────────────
  user:    null,
  setUser: (user) => set({ user }),
  logout:  () => set(s => ({
    user:null, activeEntity:null, activeModule:'dashboard',
    activeProject:null, pendingBookingUnit:null, dataLoaded:false,
    projects:[], bookings:[], vendors:[], brokers:[],
    employees:[], ledgerEntries:[], crmLeads:[],
    // Keep entities + users — needed immediately on login screen
    entities: s.entities,
    users:    s.users,
  })),

  // ── ENTITIES (global — persists in vg_global.json) ────────────────────
  entities: [...SEED_ENTITIES],
  setEntities: (arg) => set(s => {
    const data = applyUpdate(s.entities, arg);
    saveGlobal(get);
    return { entities: data };
  }),
  addEntity: (newEntity) => set(s => {
    const code = (newEntity.code || '').toUpperCase().trim();
    const id   = Math.max(0, ...s.entities.map(e => e.id)) + 1;
    const data = [...s.entities, { ...newEntity, id, code }];
    saveGlobal(get);
    return { entities: data };
  }),
  updateEntity: (updated) => set(s => {
    const data = s.entities.map(e => e.id === updated.id ? { ...e, ...updated } : e);
    saveGlobal(get);
    return { entities: data };
  }),

  // ── USERS (global — persists in vg_global.json) ───────────────────────
  users: [],
  setUsers: (arg) => set(s => {
    const data = applyUpdate(s.users, arg);
    saveGlobal(get);         // Users go to vg_global.json — NOT entity file
    return { users: data };
  }),

  // ── ENTITY SELECTION ──────────────────────────────────────────────────
  activeEntity:         null,
  setActiveEntity:      (e) => set({ activeEntity: e }),
  availableEntities:    [],
  setAvailableEntities: (list) => set({ availableEntities: list }),

  // ── NAVIGATION ────────────────────────────────────────────────────────
  activeModule:    'dashboard',
  setActiveModule: (mod) => set({ activeModule: mod }),

  // ── CROSS-MODULE ──────────────────────────────────────────────────────
  pendingBookingUnit:    null,
  setPendingBookingUnit: (u) => set({ pendingBookingUnit: u }),
  activeProject:         null,
  setActiveProject:      (p) => set({ activeProject: p }),

  // ── DATA LOAD STATE ───────────────────────────────────────────────────
  dataLoaded: false,

  // ── ENTITY-SPECIFIC DATA (each saves to vg_data_VEH.json etc.) ────────

  projects: [],
  setProjects: (arg) => set(s => {
    const data = applyUpdate(s.projects, arg);
    saveEntityData(get);
    return { projects: data };
  }),

  bookings: [],
  setBookings: (arg) => set(s => {
    const data = applyUpdate(s.bookings, arg);
    saveEntityData(get);
    return { bookings: data };
  }),

  vendors: [],
  setVendors: (arg) => set(s => {
    const data = applyUpdate(s.vendors, arg);
    saveEntityData(get);
    return { vendors: data };
  }),

  brokers: [],
  setBrokers: (arg) => set(s => {
    const data = applyUpdate(s.brokers, arg);
    saveEntityData(get);
    return { brokers: data };
  }),

  employees: [],
  setEmployees: (arg) => set(s => {
    const data = applyUpdate(s.employees, arg);
    saveEntityData(get);
    return { employees: data };
  }),

  ledgerEntries: [],
  setLedgerEntries: (arg) => set(s => {
    const data = applyUpdate(s.ledgerEntries, arg);
    saveEntityData(get);
    return { ledgerEntries: data };
  }),

  crmLeads: [],
  setCrmLeads: (arg) => set(s => {
    const data = applyUpdate(s.crmLeads, arg);
    saveEntityData(get);
    return { crmLeads: data };
  }),

  // ── LOAD GLOBAL (entities + users) — call on app startup ─────────────
  async loadGlobal() {
    if (!isElectron()) {
      set({ dataLoaded: true });
      return;
    }
    try {
      const res = await window.vgERP.data.loadGlobal();
      if (res.ok && res.data) {
        const d = res.data;
        const updates = {};
        if (Array.isArray(d.entities) && d.entities.length > 0) {
          updates.entities = d.entities;
          console.log('[Store] ✓ Loaded entities:', d.entities.map(e=>e.code).join(', '));
        }
        if (Array.isArray(d.users) && d.users.length > 0) {
          updates.users = d.users;
          console.log('[Store] ✓ Loaded users:', d.users.length);
        }
        if (Object.keys(updates).length > 0) set(updates);
      } else {
        console.log('[Store] No vg_global.json yet — using seed entities');
      }
    } catch (e) {
      console.warn('[Store] loadGlobal error:', e);
    }
  },

  // ── LOAD ENTITY DATA — call after entity selected on login ────────────
  async loadFromFile(entityCode) {
    if (!isElectron()) {
      console.warn('[Store] Not in Electron — data will not persist');
      set({ dataLoaded: true });
      return;
    }
    try {
      console.log('[Store] Loading entity data for', entityCode);
      const res = await window.vgERP.data.load(entityCode);
      if (res.ok && res.data) {
        const d = res.data;
        set({
          projects:      Array.isArray(d.projects)      ? d.projects      : [],
          bookings:      Array.isArray(d.bookings)      ? d.bookings      : [],
          vendors:       Array.isArray(d.vendors)       ? d.vendors       : [],
          brokers:       Array.isArray(d.brokers)       ? d.brokers       : [],
          employees:     Array.isArray(d.employees)     ? d.employees     : [],
          ledgerEntries: Array.isArray(d.ledgerEntries) ? d.ledgerEntries : [],
          crmLeads:      Array.isArray(d.crmLeads)      ? d.crmLeads      : [],
          dataLoaded: true,
        });
        console.log('[Store] ✓ Loaded', entityCode,
          '| projects:', (d.projects||[]).length,
          '| bookings:', (d.bookings||[]).length);
        if (res.fromBackup) console.warn('[Store] ⚠ Loaded from backup!');
      } else if (res.ok && !res.data) {
        console.log('[Store] Fresh start for', entityCode);
        set({ projects:[], bookings:[], vendors:[], brokers:[], employees:[], ledgerEntries:[], crmLeads:[], dataLoaded: true });
      } else {
        console.error('[Store] Load error:', res.error);
        set({ dataLoaded: true });
      }
    } catch (e) {
      console.error('[Store] loadFromFile error:', e);
      set({ dataLoaded: true });
    }
  },

  // ── SYNC FOLDER PATH ──────────────────────────────────────────────────
  oneDrivePath:    null,
  setOneDrivePath: (p) => set({ oneDrivePath: p }),

  // ── TOAST ─────────────────────────────────────────────────────────────
  toasts: [],
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
