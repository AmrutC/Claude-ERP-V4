import React, { useState } from 'react';
import { useAppStore, getNavItems } from '../stores/appStore';
import { ChevronDown, ChevronRight, LogOut, Settings, LayoutDashboard, Users, Building2, BookOpen,
  CreditCard, FileText, BarChart3, Receipt, UserCheck, Handshake, Truck,
  PieChart, ClipboardList, MessageSquare } from 'lucide-react';
import { clx } from '../utils';

const ICONS = {
  dashboard:LayoutDashboard, crm:Users, inventory:Building2, bookings:BookOpen,
  payments:CreditCard, documents:FileText, accounts:BarChart3, gst:Receipt,
  hr:UserCheck, brokerage:Handshake, vendors:Truck, mis:PieChart,
  audit:ClipboardList, communication:MessageSquare, admin:Settings,
};

const LABELS = {
  dashboard:'Dashboard', crm:'CRM & Leads', inventory:'Projects & Inventory',
  bookings:'Bookings', payments:'Payments & Collections', documents:'Documents',
  accounts:'Accounts & Ledger', gst:'GST & Tax', hr:'HR & Payroll',
  brokerage:'Brokerage', vendors:'Vendors', mis:'MIS Reports',
  audit:'Audit Log', communication:'Communication', admin:'Admin Setup',
};

const SUBS = {
  gst:     ['GST Register','Monthly Liability','Slab Summary','ITC Register','TDS Register'],
  hr:      ['Employees','Attendance','Payroll','HR Documents'],
  vendors: ['Vendor Master','Bills Register','Pending Payments'],
  admin:   ['Entities','Users & Roles','Banks','Settings'],
  accounts:['Ledger Entries','GST Payment Entry'],
};

const GROUPS = [
  { label:'CORE',        items:['dashboard','crm','inventory','bookings','payments'] },
  { label:'FINANCE',     items:['documents','accounts','gst'] },
  { label:'OPERATIONS',  items:['hr','brokerage','vendors'] },
  { label:'MANAGEMENT',  items:['mis','audit','communication','admin'] },
];

export default function Sidebar() {
  const { user, activeEntity, activeModule, setActiveModule, logout } = useAppStore();
  const [open, setOpen] = useState({});
  const navItems = getNavItems(user?.role);

  function handleClick(id) {
    if (SUBS[id]) {
      // Always toggle open state, and also navigate to the module
      setActiveModule(id);
      setOpen(prev => ({ ...prev, [id]: !prev[id] }));
    } else {
      setActiveModule(id);
      setOpen({});
    }
  }

  return (
    <aside style={{ width:216, background:'#0D1E35', display:'flex', flexDirection:'column', flexShrink:0, overflow:'hidden', zIndex:20 }}>

      {/* Logo */}
      <div style={{ padding:'16px 16px 14px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'rgba(201,149,30,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <img src="/assets/icon.png" alt="VG" style={{ width:26, height:26, objectFit:'contain' }} onError={e=>e.target.style.display='none'}/>
          </div>
          <div>
            <div style={{ color:'#F0C040', fontWeight:800, fontSize:14, lineHeight:1 }}>Vision Grroup</div>
            <div style={{ color:'rgba(255,255,255,0.35)', fontSize:9, textTransform:'uppercase', letterSpacing:'1px', marginTop:2 }}>ERP v4.0</div>
          </div>
        </div>
      </div>

      {/* Entity */}
      <div style={{ padding:'10px 12px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize:8.5, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:5 }}>Active Entity</div>
        <div style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:7, padding:'7px 10px', display:'flex', alignItems:'center', gap:7 }}>
          {activeEntity?.code && (
            <span style={{ background:'#C9951E', color:'#0D1E35', fontSize:9, fontWeight:800, padding:'2px 6px', borderRadius:4, flexShrink:0 }}>
              {activeEntity.code}
            </span>
          )}
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.80)', lineHeight:1.3 }}>{activeEntity?.name || 'No entity selected'}</span>
        </div>
        <button onClick={logout} style={{ width:'100%', fontSize:9, color:'rgba(255,255,255,0.30)', background:'none', border:'none', cursor:'pointer', textAlign:'center', marginTop:4, padding:'2px 0' }}>
          Logout to switch entity
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, overflowY:'auto', padding:'4px 0' }}>
        {GROUPS.map(g => (
          <div key={g.label}>
            <div style={{ padding:'10px 14px 4px', fontSize:8.5, fontWeight:700, color:'rgba(255,255,255,0.30)', textTransform:'uppercase', letterSpacing:'0.8px' }}>
              {g.label}
            </div>
            {g.items.filter(id => navItems.includes(id)).map(id => {
              const Icon = ICONS[id] || LayoutDashboard;
              const active = activeModule === id;
              const hasSubs = !!SUBS[id];
              const isOpen = open[id];

              return (
                <div key={id}>
                  <button onClick={() => handleClick(id)} style={{
                    width:'100%', display:'flex', alignItems:'center', gap:8,
                    padding:'8px 14px', fontSize:12, fontWeight: active ? 700 : 500,
                    color: active ? '#ffffff' : 'rgba(255,255,255,0.72)',
                    background: active ? 'rgba(255,255,255,0.10)' : 'transparent',
                    borderLeft: `2px solid ${active ? '#C9951E' : 'transparent'}`,
                    border:'none', borderLeft: active ? '2px solid #C9951E' : '2px solid transparent',
                    cursor:'pointer', textAlign:'left', transition:'all 0.12s',
                  }}
                  onMouseEnter={e=>{ if(!active) e.currentTarget.style.color='rgba(255,255,255,0.92)'; e.currentTarget.style.background='rgba(255,255,255,0.06)'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.color=active?'#ffffff':'rgba(255,255,255,0.72)'; e.currentTarget.style.background=active?'rgba(255,255,255,0.10)':'transparent'; }}>
                    <Icon size={13} style={{ opacity: active ? 1 : 0.7, flexShrink:0 }}/>
                    <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{LABELS[id] || id}</span>
                    {hasSubs && (isOpen
                      ? <ChevronDown size={10} style={{ opacity:0.6, flexShrink:0 }}/>
                      : <ChevronRight size={10} style={{ opacity:0.4, flexShrink:0 }}/>
                    )}
                  </button>

                  {hasSubs && isOpen && (
                    <div style={{ borderLeft:'1px solid rgba(255,255,255,0.08)', marginLeft:16, background:'rgba(0,0,0,0.12)' }}>
                      {SUBS[id].map(label => (
                        <button key={label} onClick={() => setActiveModule(id)} style={{
                          width:'100%', display:'flex', alignItems:'center', gap:6,
                          padding:'6px 14px', fontSize:11, fontWeight:400,
                          color:'rgba(255,255,255,0.60)', cursor:'pointer',
                          background:'transparent', border:'none', textAlign:'left',
                        }}
                        onMouseEnter={e=>{ e.currentTarget.style.color='rgba(255,255,255,0.90)'; e.currentTarget.style.background='rgba(255,255,255,0.04)'; }}
                        onMouseLeave={e=>{ e.currentTarget.style.color='rgba(255,255,255,0.60)'; e.currentTarget.style.background='transparent'; }}>
                          <div style={{ width:3, height:3, borderRadius:'50%', background:'rgba(201,149,30,0.6)', flexShrink:0 }}/>
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding:'10px 12px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, padding:'0 2px' }}>
          <div style={{ width:26, height:26, borderRadius:'50%', background:'rgba(201,149,30,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#F0C040', flexShrink:0 }}>
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11.5, color:'rgba(255,255,255,0.85)', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.full_name}</div>
            <div style={{ fontSize:9.5, color:'rgba(255,255,255,0.40)', textTransform:'capitalize' }}>{user?.role?.replace(/_/g,' ')}</div>
          </div>
        </div>
        <button onClick={logout} style={{
          width:'100%', display:'flex', alignItems:'center', gap:6,
          padding:'6px 8px', fontSize:11, color:'rgba(255,255,255,0.40)',
          background:'transparent', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, cursor:'pointer',
        }}
        onMouseEnter={e=>{ e.currentTarget.style.color='rgba(255,255,255,0.75)'; e.currentTarget.style.background='rgba(255,255,255,0.06)'; }}
        onMouseLeave={e=>{ e.currentTarget.style.color='rgba(255,255,255,0.40)'; e.currentTarget.style.background='transparent'; }}>
          <LogOut size={11}/> Sign out
        </button>
      </div>
    </aside>
  );
}
