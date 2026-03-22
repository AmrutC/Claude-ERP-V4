import React, { useState } from 'react';
import { useAppStore, getNavItems } from '../stores/appStore';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Toast from './ui/Toast';

// Module screens (stubs — developer fills in)
import Dashboard from './modules/Dashboard';
import Projects from './modules/Projects';
import Inventory from './modules/Inventory';

// Combined Projects & Inventory wrapper
function ProjectsAndInventory() {
  const [subTab, setSubTab] = React.useState('projects');
  return (
    <div>
      <div style={{ display:'flex', gap:3, background:'#F3F4F6', borderRadius:10, padding:3, marginBottom:18, width:'fit-content' }}>
        {[['projects','Projects'],['inventory','Inventory']].map(([id,label])=>(
          <button key={id} onClick={()=>setSubTab(id)}
            style={{ padding:'6px 22px', borderRadius:7, fontSize:13, fontWeight:subTab===id?700:500, color:subTab===id?'#0D1E35':'#6B7280', background:subTab===id?'#fff':'transparent', cursor:'pointer', border:subTab===id?'1px solid #E5E7EB':'1px solid transparent', boxShadow:subTab===id?'0 1px 3px rgba(0,0,0,0.08)':'', transition:'all .12s' }}>
            {label}
          </button>
        ))}
      </div>
      {subTab==='projects' ? <Projects/> : <Inventory/>}
    </div>
  );
}
import CRM from './modules/CRM';
import Bookings from './modules/Bookings';
import Payments from './modules/Payments';
import Documents from './modules/Documents';
import Accounts from './modules/Accounts';
import GST from './modules/GST';
import HR from './modules/HR';
import Brokerage from './modules/Brokerage';
import Vendors from './modules/Vendors';
import MIS from './modules/MIS';
import AuditLog from './modules/AuditLog';
import Communication from './modules/Communication';
import AdminSetup from './modules/AdminSetup';

const SCREENS = {
  dashboard:    { component: Dashboard,    label: 'Dashboard' },
  crm:          { component: CRM,          label: 'CRM & Leads' },
  inventory:    { component: ProjectsAndInventory, label: 'Projects & Inventory' },
  bookings:     { component: Bookings,     label: 'Customers & Bookings' },
  payments:     { component: Payments,     label: 'Payments & Collections' },
  documents:    { component: Documents,    label: 'Document Automation' },
  accounts:     { component: Accounts,     label: 'Accounts & Ledger' },
  gst:          { component: GST,          label: 'GST & Tax Reports' },
  hr:           { component: HR,           label: 'HR & Payroll' },
  brokerage:    { component: Brokerage,    label: 'Brokerage' },
  vendors:      { component: Vendors,      label: 'Vendors & Contractors' },
  mis:          { component: MIS,          label: 'MIS & Reports' },
  audit:        { component: AuditLog,     label: 'Audit Log' },
  communication:{ component: Communication,label: 'Communication' },
  admin:        { component: AdminSetup,   label: 'Admin Setup' },
};

export default function Shell() {
  const { activeModule, user, toasts } = useAppStore();
  const screen = SCREENS[activeModule] || SCREENS.dashboard;
  const Screen = screen.component;

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      <Sidebar screens={SCREENS} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={screen.label} />
        <main className="flex-1 overflow-y-auto p-5">
          {getNavItems(user?.role).includes(activeModule) ? (
            <Screen />
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-4xl mb-3">🔒</div>
                <div className="text-navy font-semibold">Access Restricted</div>
                <div className="text-gray-500 text-sm mt-1">You don't have permission to view this module.</div>
              </div>
            </div>
          )}
        </main>
      </div>
      <Toast toasts={toasts} />
    </div>
  );
}
