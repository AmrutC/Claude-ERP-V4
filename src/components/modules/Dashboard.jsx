import React from 'react';
import { useAppStore } from '../../stores/appStore';
import StatCard from '../ui/StatCard';
import Badge from '../ui/Badge';
import { inr, fmtDate } from '../../utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { AlertTriangle, Clock, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';

// ── DEMO DATA ─────────────────────────────────────────────────────────────
const COLLECTIONS = [
  { month:'Oct', demand:20, received:1800000 },
  { month:'Nov', demand:1500000, received:1500000 },
  { month:'Dec', demand:2800000, received:20 },
  { month:'Jan', demand:10, received:900000  },
  { month:'Feb', demand:2500000, received:2100000 },
  { month:'Mar', demand:30, received:0 },
];
const UNIT_STATUS = [
  { status:'Available',        count:14, color:'#15803D' },
  { status:'Booked',           count:3,  color:'#1D4ED8' },
  { status:'Agreement Done',   count:2,  color:'#D97706' },
  { status:'Registered',       count:1,  color:'#7C3AED' },
  { status:'Possession Given', count:0,  color:'#0F766E' },
  { status:'Cancelled',        count:1,  color:'#DC2626' },
];
const UPCOMING_DEMANDS = [
  { id:1, flat:'A-101', allottee:'Ramesh Patil', milestone:'Ground Floor Slab', amount:536250, due:'2026-03-25', overdue:false },
  { id:2, flat:'B-202', allottee:'Sunita Mehta', milestone:'Booking Advance',   amount:0, due:'2026-03-18', overdue:true  },
  { id:3, flat:'C-301', allottee:'Ajay Kumar',   milestone:'Agreement Stage',   amount:0, due:'2026-04-01', overdue:false },
];
const ALERTS = [
  { id:1, type:'warning', msg:'RERA renewal due in 78 days — Vision Harmony' },
  { id:2, type:'error',   msg:'2 milestone payments overdue — ₹8,24,750 total' },
  { id:3, type:'info',    msg:'3 KYC documents pending verification' },
];
const ALERT_STYLES = {
  error:   { bg:'#FEE2E2', border:'#FCA5A5', text:'#7F1D1D', icon:'#DC2626' },
  warning: { bg:'#FEF3C7', border:'#FCD34D', text:'#78350F', icon:'#D97706' },
  info:    { bg:'#DBEAFE', border:'#93C5FD', text:'#1E3A8A', icon:'#2563EB' },
};

// ── HELPERS ───────────────────────────────────────────────────────────────
const Card = ({ children, style }) => (
  <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'18px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', ...style }}>
    {children}
  </div>
);
const PTitle = ({ text }) => (
  <div style={{ fontSize:11, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:14 }}>{text}</div>
);
const KPIGrid = ({ kpis, cols=4 }) => (
  <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap:12 }}>
    {kpis.map(k => <StatCard key={k.label} label={k.label} value={k.value} color={k.color} icon={k.icon}/>)}
  </div>
);

// ── SHARED PANELS ─────────────────────────────────────────────────────────
function CollectionChart() {
  return (
    <Card>
      <PTitle text="Collection Efficiency — Last 6 Months"/>
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={COLLECTIONS} barCategoryGap="28%" barSize={14}>
          <XAxis dataKey="month" tick={{ fontSize:11, fill:'#4B5563', fontWeight:600 }} axisLine={false} tickLine={false}/>
          <YAxis tickFormatter={v=>'₹'+v/100000+'L'} tick={{ fontSize:10, fill:'#4B5563' }} axisLine={false} tickLine={false} width={52}/>
          <Tooltip formatter={v=>[inr(v),'']} labelStyle={{ fontSize:12, fontWeight:700, color:'#0D1E35' }} contentStyle={{ borderRadius:10, border:'1px solid #E5E7EB', fontSize:12, color:'#111827' }}/>
          <Legend wrapperStyle={{ fontSize:12, color:'#374151', fontWeight:600 }} iconType="circle" iconSize={8}/>
          <Bar dataKey="demand"   name="Demanded" fill="#CBD5E1" radius={[4,4,0,0]}/>
          <Bar dataKey="received" name="Received"  fill="#0D1E35" radius={[4,4,0,0]}/>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function UnitStatusPanel() {
  const total = UNIT_STATUS.reduce((s,x)=>s+x.count,0)||1;
  return (
    <Card>
      <PTitle text="Unit Status"/>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {UNIT_STATUS.map(s => {
          const pct = Math.round(s.count/total*100);
          return (
            <div key={s.status}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:12, color:'#374151', fontWeight:600 }}>{s.status}</span>
                <span style={{ fontSize:12, fontWeight:800, color:'#0D1E35', fontFamily:'monospace' }}>{s.count}</span>
              </div>
              <div style={{ height:6, background:'#F3F4F6', borderRadius:3, overflow:'hidden' }}>
                <div style={{ width:`${pct}%`, height:'100%', background:s.color, borderRadius:3 }}/>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid #F3F4F6', display:'flex', justifyContent:'space-between' }}>
        <span style={{ fontSize:11, color:'#4B5563', fontWeight:600 }}>Total Units</span>
        <span style={{ fontSize:13, fontWeight:800, color:'#0D1E35' }}>{total}</span>
      </div>
    </Card>
  );
}

// ── DIRECTOR / SUPER ADMIN ────────────────────────────────────────────────
function DirectorDashboard() {
  const kpis = [
    { label:'Bookings MTD',    value:0,                   color:'blue',   icon:TrendingUp },
    { label:'Collections MTD', value:inr(0,true),   color:'green',  icon:TrendingUp },
    { label:'GST This Month',  value:inr(0,true),     color:'amber'  },
    { label:'Bank Balance',    value:inr(0,true),   color:'navy'   },
    { label:'Cash in Hand',    value:inr(0,true),     color:'teal'   },
    { label:'Vendor Dues',     value:inr(0,true),    color:'red',    icon:TrendingDown },
    { label:'Active Leads',    value:0,                  color:'purple' },
    { label:'Units Available', value:0,                  color:'green'  },
  ];
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <KPIGrid kpis={kpis} cols={4}/>
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>
        <CollectionChart/>
        <UnitStatusPanel/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }}>
        {/* Upcoming demands */}
        <Card>
          <PTitle text="Upcoming & Overdue Demands"/>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {UPCOMING_DEMANDS.map(d => (
              <div key={d.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:10, background:d.overdue?'#FEF2F2':'#F8FAFC', border:`1px solid ${d.overdue?'#FECACA':'#E5E7EB'}` }}>
                <div style={{ color:d.overdue?'#DC2626':'#D97706', flexShrink:0 }}>
                  {d.overdue ? <AlertTriangle size={16}/> : <Clock size={16}/>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#0D1E35' }}>{d.flat} — {d.allottee}</div>
                  <div style={{ fontSize:11.5, color:'#4B5563', marginTop:2 }}>{d.milestone}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:'#0D1E35', fontFamily:'monospace' }}>{inr(d.amount)}</div>
                  <div style={{ fontSize:11, fontWeight:700, color:d.overdue?'#DC2626':'#6B7280', marginTop:2 }}>
                    {d.overdue?'OVERDUE':fmtDate(d.due)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        {/* Right column */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Card>
            <PTitle text="Alerts"/>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {ALERTS.map(a => {
                const s = ALERT_STYLES[a.type] || ALERT_STYLES.info;
                return (
                  <div key={a.id} style={{ display:'flex', gap:8, alignItems:'flex-start', padding:'8px 10px', borderRadius:8, background:s.bg, border:`1px solid ${s.border}` }}>
                    <AlertTriangle size={13} style={{ color:s.icon, flexShrink:0, marginTop:1 }}/>
                    <span style={{ fontSize:11.5, color:s.text, lineHeight:1.5, fontWeight:500 }}>{a.msg}</span>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card style={{ flex:1 }}>
            <PTitle text="Quick Numbers"/>
            {[['Total Projects','1'],['Total Bookings','3'],['Collections FY','₹13.7L'],['Vendor Bills Due','₹1.5L']].map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #F9FAFB' }}>
                <span style={{ fontSize:12.5, color:'#374151' }}>{l}</span>
                <span style={{ fontSize:13, fontWeight:800, color:'#0D1E35', fontFamily:'monospace' }}>{v}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── ACCOUNTS MANAGER ──────────────────────────────────────────────────────
function AccountsDashboard() {
  const kpis = [
    { label:'Collections MTD',  value:inr(0,true), color:'green',  icon:TrendingUp },
    { label:'Overdue Amount',   value:inr(0,true),  color:'red',    icon:TrendingDown },
    { label:'GST This Month',   value:inr(0,true),   color:'amber'  },
    { label:'Bank Balance',     value:inr(0,true), color:'navy'   },
    { label:'Cash in Hand',     value:inr(0,true),   color:'teal'   },
    { label:'Vendor Dues',      value:inr(0,true),  color:'red'    },
  ];
  const demandQueue = [
    { flat:'B-202', allottee:'Sunita Mehta',  milestone:'Booking Advance',    total:0, due:'2026-03-18', overdue:true  },
    { flat:'C-301', allottee:'Ajay Kumar',    milestone:'Agreement Execution', total:0, due:'2026-04-01', overdue:false },
    { flat:'A-101', allottee:'Ramesh Patil',  milestone:'Ground Floor Slab',  total:536250, due:'2026-03-25', overdue:false },
  ];
  const recentPayments = [
    { flat:'A-101', allottee:'Ramesh Patil', amount:0, date:'2026-03-14', mode:'NEFT'   },
    { flat:'B-202', allottee:'Sunita Mehta', amount:0, date:'2026-03-12', mode:'Cheque' },
  ];
  const budget = [
    { head:'Labour',      budget:1500000, actual:120000 },
    { head:'Consultancy', budget:800000,  actual:150000 },
    { head:'Legal',       budget:0,  actual:35000  },
    { head:'Materials',   budget:5000000, actual:76000  },
    { head:'Admin',       budget:0,  actual:18000  },
  ];
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <KPIGrid kpis={kpis} cols={3}/>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* Demand Action Queue */}
        <Card>
          <PTitle text="Demand Action Queue"/>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {demandQueue.map((m,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:m.overdue?'#FEF2F2':'#F8FAFC', border:`1px solid ${m.overdue?'#FECACA':'#E5E7EB'}` }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#0D1E35' }}>{m.flat} — {m.allottee}</div>
                  <div style={{ fontSize:11.5, color:'#4B5563', marginTop:1 }}>{m.milestone}</div>
                </div>
                <div style={{ textAlign:'right', marginRight:8 }}>
                  <div style={{ fontSize:12, fontWeight:800, color:'#0D1E35', fontFamily:'monospace' }}>{inr(m.total)}</div>
                  <div style={{ fontSize:10.5, color:m.overdue?'#DC2626':'#6B7280', fontWeight:700 }}>{m.overdue?'OVERDUE':fmtDate(m.due)}</div>
                </div>
                <button style={{ background:'#FEF3C7', border:'1px solid #FCD34D', borderRadius:7, padding:'5px 10px', cursor:'pointer', fontSize:11, fontWeight:700, color:'#78350F', whiteSpace:'nowrap' }}>
                  Generate
                </button>
              </div>
            ))}
          </div>
        </Card>
        {/* Recent Payments */}
        <Card>
          <PTitle text="Recent Payments"/>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {recentPayments.map((p,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:10, background:'#F0FDF4', border:'1px solid #BBF7D0' }}>
                <CheckCircle2 size={15} style={{ color:'#15803D', flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#0D1E35' }}>{p.flat} — {p.allottee}</div>
                  <div style={{ fontSize:11.5, color:'#4B5563', marginTop:1 }}>{fmtDate(p.date)} · {p.mode}</div>
                </div>
                <div style={{ fontSize:13, fontWeight:800, color:'#14532D', fontFamily:'monospace' }}>{inr(p.amount)}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:10, padding:'8px 12px', background:'#EAF0F8', borderRadius:8, display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:12, color:'#0D1E35', fontWeight:600 }}>Total Received MTD</span>
            <span style={{ fontSize:13, fontWeight:800, color:'#0D1E35', fontFamily:'monospace' }}>₹0</span>
          </div>
        </Card>
      </div>
      {/* Budget Utilisation */}
      <Card>
        <PTitle text="Budget vs Actual — Vision Harmony"/>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10 }}>
          {budget.map(b => {
            const pct = Math.round(b.actual/b.budget*100);
            return (
              <div key={b.head} style={{ background:'#F8FAFC', borderRadius:10, padding:'10px 12px' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:6 }}>{b.head}</div>
                <div style={{ fontSize:13, fontWeight:800, color:'#0D1E35', fontFamily:'monospace', marginBottom:2 }}>{inr(b.actual,true)}</div>
                <div style={{ fontSize:10.5, color:'#6B7280', marginBottom:6 }}>of {inr(b.budget,true)}</div>
                <div style={{ height:5, background:'#E5E7EB', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ width:`${Math.min(pct,100)}%`, height:'100%', background:pct>80?'#DC2626':pct>50?'#D97706':'#15803D', borderRadius:3 }}/>
                </div>
                <div style={{ fontSize:10.5, fontWeight:700, color:pct>80?'#DC2626':pct>50?'#D97706':'#15803D', marginTop:3 }}>{pct}% used</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ── SALES EXECUTIVE ───────────────────────────────────────────────────────
function SalesDashboard() {
  const kpis = [
    { label:'My Leads',          value:0,   color:'blue'   },
    { label:'My Bookings',       value:0,   color:'navy'   },
    { label:'Units Available',   value:0,  color:'green'  },
    { label:'Follow-ups Today',  value:0,   color:'amber'  },
    { label:'Conversions MTD',   value:0,   color:'teal'   },
  ];
  const followUps = [
    { name:'Anil Mehta',   phone:'9876541001', status:'Negotiation',     due:'2026-03-16', overdue:true  },
    { name:'Kavita Patil', phone:'9876541002', status:'Site Visit Done', due:'2026-03-18', overdue:false },
    { name:'Suresh Desai', phone:'9876541003', status:'New',             due:'2026-03-16', overdue:true  },
  ];
  const myBookings = [
    { booking_no:'BKG/VEH/26-27/001', flat:'A-101', allottee:'Ramesh Patil', value:0, status:'Booked' },
    { booking_no:'BKG/VEH/26-27/002', flat:'B-202', allottee:'Sunita Mehta', value:0, status:'Agreement Done' },
  ];
  const unitPie = UNIT_STATUS.filter(s=>s.count>0).map(s=>({ name:s.status, value:s.count, color:s.color }));
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <KPIGrid kpis={kpis} cols={5}/>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* Follow-up list */}
        <Card>
          <PTitle text="My Follow-ups"/>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {followUps.map((f,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:10, background:f.overdue?'#FEF2F2':'#F8FAFC', border:`1px solid ${f.overdue?'#FECACA':'#E5E7EB'}` }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#0D1E35' }}>{f.name}</div>
                  <div style={{ fontSize:11.5, color:'#4B5563', marginTop:1 }}>{f.phone} · {f.status}</div>
                </div>
                <div style={{ fontSize:11, fontWeight:700, color:f.overdue?'#DC2626':'#6B7280' }}>
                  {f.overdue ? '⚠ OVERDUE' : fmtDate(f.due)}
                </div>
              </div>
            ))}
          </div>
        </Card>
        {/* Inventory pie */}
        <Card>
          <PTitle text="Project Inventory Status"/>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={unitPie} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({name,value})=>`${name}: ${value}`} labelLine={false}>
                {unitPie.map((s,i) => <Cell key={i} fill={s.color}/>)}
              </Pie>
              <Tooltip formatter={(v,n) => [v+' units', n]}/>
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
      {/* My bookings table */}
      <Card>
        <PTitle text="My Bookings"/>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr style={{ background:'#F9FAFB', borderBottom:'2px solid #E5E7EB' }}>
            {['Booking No.','Flat','Allottee','Agreement Value','Status'].map(h=>(
              <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.4px', whiteSpace:'nowrap' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {myBookings.map((b,i) => (
              <tr key={b.booking_no} style={{ borderBottom:'1px solid #F3F4F6', background:i%2===0?'#fff':'#FAFAFA' }}>
                <td style={{ padding:'9px 14px', fontSize:11.5, fontFamily:'monospace', fontWeight:700, color:'#0D1E35' }}>{b.booking_no}</td>
                <td style={{ padding:'9px 14px', fontSize:13, fontWeight:700, color:'#1D4ED8' }}>{b.flat}</td>
                <td style={{ padding:'9px 14px', fontSize:13, fontWeight:600, color:'#111827' }}>{b.allottee}</td>
                <td style={{ padding:'9px 14px', fontSize:13, fontWeight:800, fontFamily:'monospace', textAlign:'right', color:'#0D1E35' }}>{inr(b.value)}</td>
                <td style={{ padding:'9px 14px' }}><Badge value={b.status}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── BROKER ────────────────────────────────────────────────────────────────
function BrokerDashboard() {
  const kpis = [
    { label:'My Bookings',     value:0,              color:'blue'  },
    { label:'Brokerage Due',   value:inr(0,true), color:'amber' },
    { label:'Brokerage Paid',  value:'₹0',           color:'gray'  },
    { label:'Active Clients',  value:0,              color:'teal'  },
    { label:'Units Available', value:0,             color:'green' },
  ];
  const myBookings = [
    { booking_no:'BKG/VEH/26-27/001', flat:'A-101', allottee:'Ramesh Patil', value:0, brokerage:33963, status:'Booked', payout:'Pending' },
  ];
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <div style={{ background:'#EAF0F8', border:'1px solid #C5D5E8', borderRadius:12, padding:'12px 18px', fontSize:12.5, color:'#0D1E35', lineHeight:1.6 }}>
        <strong>Broker Portal</strong> — View your mapped bookings, clients, and brokerage payouts below. Contact the Vision Grroup team for any updates or queries.
      </div>
      <KPIGrid kpis={kpis} cols={5}/>
      <Card>
        <PTitle text="My Client Bookings"/>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr style={{ background:'#F9FAFB', borderBottom:'2px solid #E5E7EB' }}>
            {['Booking No.','Flat','Client','Agreement Value','Brokerage (Net of TDS)','Payout Status','Booking Status'].map(h=>(
              <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.4px', whiteSpace:'nowrap' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {myBookings.map((b,i) => (
              <tr key={b.booking_no} style={{ borderBottom:'1px solid #F3F4F6' }}>
                <td style={{ padding:'9px 14px', fontSize:11.5, fontFamily:'monospace', fontWeight:700, color:'#0D1E35' }}>{b.booking_no}</td>
                <td style={{ padding:'9px 14px', fontSize:13, fontWeight:700, color:'#1D4ED8' }}>{b.flat}</td>
                <td style={{ padding:'9px 14px', fontSize:13, fontWeight:600, color:'#111827' }}>{b.allottee}</td>
                <td style={{ padding:'9px 14px', fontSize:13, fontWeight:800, fontFamily:'monospace', textAlign:'right', color:'#0D1E35' }}>{inr(b.value)}</td>
                <td style={{ padding:'9px 14px', fontSize:13, fontWeight:800, fontFamily:'monospace', textAlign:'right', color:'#78350F' }}>{inr(b.brokerage)}</td>
                <td style={{ padding:'9px 14px' }}><Badge value={b.payout}/></td>
                <td style={{ padding:'9px 14px' }}><Badge value={b.status}/></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop:12, padding:'10px 14px', background:'#FEF3C7', border:'1px solid #FCD34D', borderRadius:9, fontSize:12, color:'#78350F' }}>
          Brokerage shown is net of 5% TDS u/s 194H. TDS certificate issued quarterly.
        </div>
      </Card>
    </div>
  );
}

// ── HR MANAGER ────────────────────────────────────────────────────────────
function HRDashboard() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        <StatCard label="Total Employees" value="3"     color="blue"/>
        <StatCard label="Monthly Payroll"  value="₹1.38L" color="navy"/>
        <StatCard label="Pending Leaves"   value="0"    color="amber"/>
      </div>
      <Card>
        <div style={{ textAlign:'center', padding:32, color:'#6B7280', fontSize:13 }}>
          Go to <strong style={{ color:'#0D1E35' }}>HR & Payroll</strong> module to manage employees, attendance, and monthly payroll.
        </div>
      </Card>
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAppStore();
  const role = user?.role || 'director';

  if (role === 'director'         || role === 'super_admin')   return <DirectorDashboard/>;
  if (role === 'accounts_manager')                             return <AccountsDashboard/>;
  if (role === 'sales_executive')                              return <SalesDashboard/>;
  if (role === 'broker')                                       return <BrokerDashboard/>;
  if (role === 'hr_manager')                                   return <HRDashboard/>;
  return <DirectorDashboard/>; // legal_doc_user fallback
}
