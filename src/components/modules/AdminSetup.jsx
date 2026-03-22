import React, { useState } from 'react';
import { useAppStore, ROLE_LABELS } from '../../stores/appStore';
import { can, VALIDATE } from '../../data';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { Plus, Edit2, Upload, Building2, User, CreditCard, Settings, FileText, Lock } from 'lucide-react';

const inp  = { width:'100%', border:'1px solid #D1D5DB', borderRadius:8, padding:'7px 10px', fontSize:13, color:'#111827', background:'#fff', outline:'none', fontFamily:'Inter,system-ui,sans-serif' };
const inpE = { ...inp, border:'1px solid #EF4444', background:'#FFF5F5' };
const sel  = { ...inp, cursor:'pointer' };
const F = ({ label, required, error, children, span }) => (
  <div style={{ gridColumn:span?`span ${span}`:undefined }}>
    <label style={{ display:'block', fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>
      {label}{required&&<span style={{ color:'#DC2626', marginLeft:2 }}>*</span>}
    </label>
    {children}
    {error&&<div style={{ fontSize:11, color:'#DC2626', marginTop:3 }}>{error}</div>}
  </div>
);

const ROLES = Object.keys(ROLE_LABELS);
const ROLE_COLORS = { super_admin:{bg:'#FEE2E2',text:'#7F1D1D'}, director:{bg:'#EDE9FE',text:'#4C1D95'}, accounts_manager:{bg:'#DBEAFE',text:'#1E3A8A'}, sales_executive:{bg:'#DCFCE7',text:'#14532D'}, hr_manager:{bg:'#CCFBF1',text:'#134E4A'}, broker:{bg:'#FEF3C7',text:'#78350F'}, legal_doc_user:{bg:'#F3F4F6',text:'#374151'} };

const DOC_TYPES = [
  { code:'BKG', name:'Booking Acknowledgement',     desc:'Sent to allottee after booking is approved' },
  { code:'ALT', name:'Allotment Letter',             desc:'Formal allotment of flat to allottee' },
  { code:'DMD', name:'Demand Notice',               desc:'Payment demand for milestone stages' },
  { code:'RCP', name:'Payment Receipt',             desc:'Receipt after payment is recorded' },
  { code:'AGR', name:'Sale Agreement / Draft',      desc:'Draft sale agreement between builder and allottee' },
  { code:'POS', name:'Possession Letter',           desc:'Letter for possession handover' },
  { code:'NOC', name:'No Objection Certificate',    desc:'NOC for loan or registration purposes' },
  { code:'CXL', name:'Cancellation Letter',         desc:'For booking cancellations' },
];

const DEMO_USERS = [];
const DEMO_BANKS = [];
const EMPTY_USER = { full_name:'', username:'', password:'', role:'sales_executive', email:'', phone:'', entity_access:[1], is_active:true };
const EMPTY_BANK = { bank_name:'', branch:'', account_no:'', ifsc:'', account_type:'Current', entity_code:'VEH', is_primary:false };
const EMPTY_ENTITY = { code:'', name:'', gstin:'', pan:'', cin_llpin:'', email:'', phone:'', address:'', authorized_signatory:'', designation:'Director' };

const TABS = [['entities','Entities',Building2],['users','Users & Roles',User],['banks','Bank Master',CreditCard],['templates','Doc Templates',FileText],['settings','App Settings',Settings]];

export default function AdminSetup() {
  const { user, users: storeUsers, setUsers, entities: storeEntities, setEntities, addEntity, updateEntity, addToast } = useAppStore();
  const isAdmin = !user || user.role === 'super_admin' || user.role === 'director' || can(user,'admin');

  // Block non-admins
  if (!isAdmin) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:80, textAlign:'center' }}>
        <Lock size={40} style={{ color:'#D1D5DB', marginBottom:16 }}/>
        <div style={{ fontSize:16, fontWeight:700, color:'#6B7280', marginBottom:8 }}>Access Restricted</div>
        <div style={{ fontSize:13, color:'#9CA3AF' }}>Admin Setup is accessible only to Super Admin and Director roles.</div>
      </div>
    );
  }

  const [tab, setTab]           = useState('entities');
  const [banks, setBanks]       = useState([]);
  // entities come from store — not local state
  const entities = storeEntities || [];
  const [templates, setTemplates] = useState(DOC_TYPES.map(d=>({...d,uploaded:false,file_name:''})));
  const [settings, setSettings] = useState({ company_name:'Vision Grroup', default_gst_rate:'5', tds_brokerage_rate:'5', working_days:'26', smtp_host:'smtp.office365.com', smtp_port:'587', smtp_user:'', smtp_pass:'' });
  const [userModal, setUserModal]     = useState(false);
  const [bankModal, setBankModal]     = useState(false);
  const [entityModal, setEntityModal] = useState(false);
  const [uForm, setUForm]     = useState(EMPTY_USER);
  const [bForm, setBForm]     = useState(EMPTY_BANK);
  const [eForm, setEForm]     = useState(EMPTY_ENTITY);
  const [editId, setEditId]   = useState(null);
  const [errors, setErrors]   = useState({});

  const setU = k => e => setUForm(f=>({...f,[k]:e.target.value}));
  const setB = k => e => setBForm(f=>({...f,[k]:e.target.value}));
  const setE = k => e => setEForm(f=>({...f,[k]:e.target.value}));
  const setS = k => e => setSettings(f=>({...f,[k]:e.target.value}));

  function saveUser() {
    if (!uForm.full_name.trim()||!uForm.username.trim()) { alert('Name and username required.'); return; }
    if (!editId && !uForm.password.trim()) { alert('Password is required for new users.'); return; }
    const cur = storeUsers||[];
    const dupe = cur.find(u=>u.username===uForm.username && u.id!==editId);
    if (dupe) { alert('Username already exists. Choose a different username.'); return; }
    if (editId) {
      setUsers(us=>us.map(u=>u.id===editId?{...u,...uForm}:u));
    } else {
      setUsers([...cur,{...uForm,id:Date.now(),last_login:null}]);
    }
    addToast(editId?'User updated.':'User added — they can now log in.','success');
    setUserModal(false);
  }
  function saveBank() {
    if (!bForm.bank_name.trim()) { alert('Bank name required.'); return; }
    if (editId) setBanks(bs=>bs.map(b=>b.id===editId?{...b,...bForm}:b));
    else setBanks(bs=>[...bs,{...bForm,id:Date.now()}]);
    addToast('Bank account saved.','success'); setBankModal(false);
  }
  function saveEntity() {
    const code = (eForm.code||'').toUpperCase().trim();
    const name = (eForm.name||'').trim();
    if (!name || !code) { alert('Entity code and name are required.'); return; }
    // Check duplicate code
    const dupe = entities.find(e => e.code === code && e.id !== editId);
    if (dupe) { alert(`Entity code "${code}" already exists.`); return; }
    if (editId) {
      // Update existing entity in store
      updateEntity({ ...eForm, code, name, id: editId });
    } else {
      // Add new entity — store assigns next ID
      addEntity({ ...eForm, code, name });
    }
    addToast(editId ? `Entity "${name}" updated and saved.` : `Entity "${code} — ${name}" added. It will appear on the login screen.`, 'success');
    setEntityModal(false);
  }

  function simulateUpload(idx) {
    setTemplates(ts=>ts.map((t,i)=>i===idx?{...t,uploaded:true,file_name:`${t.code}_Template_2026.docx`}:t));
    addToast(`Template uploaded for ${templates[idx].name}.`,'success');
  }

  return (
    <div>
      {/* Admin badge */}
      <div style={{ background:'#EDE9FE', border:'1px solid #C4B5FD', borderRadius:10, padding:'8px 14px', marginBottom:14, display:'flex', alignItems:'center', gap:8, fontSize:12.5, fontWeight:600, color:'#4C1D95' }}>
        <Lock size={13}/> Admin Setup — Restricted to Super Admin &amp; Director only
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:3, background:'#F3F4F6', borderRadius:12, padding:4, marginBottom:20, overflowX:'auto' }}>
        {TABS.map(([id,label,Icon])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'8px 0', borderRadius:9, fontSize:12.5, fontWeight:tab===id?700:500, color:tab===id?'#0D1E35':'#6B7280', background:tab===id?'#fff':'transparent', cursor:'pointer', boxShadow:tab===id?'0 1px 3px rgba(0,0,0,0.1)':'', border:'none', flexShrink:0, minWidth:120 }}>
            <Icon size={13}/>{label}
          </button>
        ))}
      </div>

      {/* ENTITIES */}
      {tab==='entities' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
            <span style={{ fontSize:13, color:'#4B5563' }}>{entities.length} entities</span>
            <button onClick={()=>{ setEForm(EMPTY_ENTITY); setEditId(null); setEntityModal(true); }} className="btn-primary" style={{ fontSize:12.5 }}><Plus size={13}/> Add Entity</button>
          </div>
          {entities.map(e=>(
            <div key={e.id} style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'18px 20px', marginBottom:12, boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                    <span style={{ background:'#0D1E35', color:'#F0C040', fontSize:12, fontWeight:800, padding:'2px 10px', borderRadius:6, fontFamily:'monospace' }}>{e.code}</span>
                    <span style={{ fontSize:16, fontWeight:800, color:'#0D1E35' }}>{e.name}</span>
                  </div>
                  <div style={{ fontSize:12, color:'#4B5563' }}>{e.address}</div>
                </div>
                <button onClick={()=>{ setEForm({...e}); setEditId(e.id); setEntityModal(true); }} style={{ background:'#F3F4F6', border:'1px solid #E5E7EB', borderRadius:8, padding:'5px 12px', cursor:'pointer', fontSize:12, fontWeight:600, color:'#374151', display:'flex', alignItems:'center', gap:5 }}><Edit2 size={11}/> Edit</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                {[['GSTIN',e.gstin||'—'],['PAN',e.pan||'—'],['CIN/LLPIN',e.cin_llpin||'—'],['Auth. Signatory',e.authorized_signatory||'—']].map(([l,v])=>(
                  <div key={l} style={{ background:'#F8FAFC', borderRadius:8, padding:'8px 11px' }}>
                    <div style={{ fontSize:9.5, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:2 }}>{l}</div>
                    <div style={{ fontSize:12.5, fontWeight:600, color:'#0D1E35', fontFamily:['GSTIN','PAN','CIN/LLPIN'].includes(l)?'monospace':'inherit' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* USERS */}
      {tab==='users' && (
        <div>
          <div style={{ background:'#EAF0F8', border:'1px solid #C5D5E8', borderRadius:10, padding:'9px 14px', marginBottom:12, fontSize:12.5, color:'#1E3A8A' }}>
            Users added here can immediately log in. Share the username and password with the team member.
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
            <span style={{ fontSize:13, color:'#4B5563' }}>{(storeUsers||[]).length} custom users (admin &amp; director are built-in)</span>
            <button onClick={()=>{ setUForm(EMPTY_USER); setEditId(null); setUserModal(true); }} className="btn-primary" style={{ fontSize:12.5 }}><Plus size={13}/> Add User</button>
          </div>
          <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ background:'#F9FAFB', borderBottom:'2px solid #E5E7EB' }}>
                {['Full Name','Username','Role','Email','Phone','Entity Access','Status',''].map(h=>(
                  <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.5px', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {(storeUsers||[]).length===0?(
                  <tr><td colSpan={8} style={{ padding:'40px 14px', textAlign:'center', fontSize:13, color:'#9CA3AF' }}>No custom users added yet. Admin and Director are built-in.</td></tr>
                ):(storeUsers||[]).map((u,i)=>{
                  const rc = ROLE_COLORS[u.role]||{bg:'#F3F4F6',text:'#374151'};
                  return (
                    <tr key={u.id} style={{ borderBottom:'1px solid #F3F4F6', background:i%2===0?'#fff':'#FAFAFA' }}>
                      <td style={{ padding:'10px 14px', fontSize:13, fontWeight:700, color:'#0D1E35' }}>{u.full_name}</td>
                      <td style={{ padding:'10px 14px', fontSize:12, fontFamily:'monospace', color:'#374151' }}>{u.username}</td>
                      <td style={{ padding:'10px 14px' }}><span style={{ background:rc.bg, color:rc.text, fontSize:10.5, fontWeight:700, padding:'2px 8px', borderRadius:12 }}>{ROLE_LABELS[u.role]||u.role}</span></td>
                      <td style={{ padding:'10px 14px', fontSize:12.5, color:'#374151' }}>{u.email||'—'}</td>
                      <td style={{ padding:'10px 14px', fontSize:12.5, color:'#374151' }}>{u.phone||'—'}</td>
                      <td style={{ padding:'10px 14px', fontSize:12, color:'#374151' }}>{Array.isArray(u.entity_access)?u.entity_access.map(id=>['','VEH','VL','ME'][id]||id).join(', '):'All'}</td>
                      <td style={{ padding:'10px 14px' }}><Badge value={u.is_active!==false?'Active':'Inactive'}/></td>
                      <td style={{ padding:'10px 14px' }}><button onClick={()=>{ setUForm({...u,password:''}); setEditId(u.id); setUserModal(true); }} style={{ background:'#F3F4F6', border:'1px solid #E5E7EB', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:11.5, fontWeight:600, color:'#374151' }}>Edit</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BANKS */}
      {tab==='banks' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
            <span style={{ fontSize:13, color:'#4B5563' }}>{banks.length} bank accounts</span>
            <button onClick={()=>{ setBForm(EMPTY_BANK); setEditId(null); setBankModal(true); }} className="btn-primary" style={{ fontSize:12.5 }}><Plus size={13}/> Add Bank Account</button>
          </div>
          {banks.map(b=>(
            <div key={b.id} style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'18px 20px', marginBottom:12, boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                    <span style={{ fontSize:15, fontWeight:800, color:'#0D1E35' }}>{b.bank_name}</span>
                    {b.is_primary&&<span style={{ background:'#DCFCE7', color:'#14532D', fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:10 }}>PRIMARY</span>}
                  </div>
                  <div style={{ fontSize:12, color:'#4B5563' }}>{b.branch} · {b.account_type} · {b.entity_code}</div>
                </div>
                <button onClick={()=>{ setBForm({...b}); setEditId(b.id); setBankModal(true); }} style={{ background:'#F3F4F6', border:'1px solid #E5E7EB', borderRadius:8, padding:'5px 12px', cursor:'pointer', fontSize:12, fontWeight:600, color:'#374151', display:'flex', alignItems:'center', gap:5 }}><Edit2 size={11}/> Edit</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                {[['Account No.',b.account_no],['IFSC Code',b.ifsc],['Account Type',b.account_type]].map(([l,v])=>(
                  <div key={l} style={{ background:'#F8FAFC', borderRadius:8, padding:'8px 11px' }}>
                    <div style={{ fontSize:9.5, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:2 }}>{l}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#0D1E35', fontFamily:'monospace' }}>{v||'—'}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DOC TEMPLATES */}
      {tab==='templates' && (
        <div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:13, color:'#4B5563', marginBottom:4 }}>Upload Word (.docx) templates for each document type. The system will merge allottee and project data into the template when generating documents.</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {templates.map((t,i)=>(
              <div key={t.code} style={{ background:'#fff', border:`1px solid ${t.uploaded?'#86EFAC':'#E5E7EB'}`, borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ width:40, height:40, borderRadius:9, background:t.uploaded?'#DCFCE7':'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <FileText size={18} style={{ color:t.uploaded?'#15803D':'#9CA3AF' }}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, fontFamily:'monospace', fontWeight:700, color:t.uploaded?'#14532D':'#374151', marginBottom:2 }}>{t.code}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#0D1E35', marginBottom:2 }}>{t.name}</div>
                  <div style={{ fontSize:11, color:'#6B7280' }}>{t.uploaded?t.file_name:t.desc}</div>
                </div>
                <button onClick={()=>simulateUpload(i)} style={{ background:t.uploaded?'#F3F4F6':'#0D1E35', color:t.uploaded?'#374151':'#fff', border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
                  <Upload size={11}/>{t.uploaded?'Replace':'Upload'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SETTINGS */}
      {tab==='settings' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'18px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#0D1E35', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:14 }}>General Settings</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
              <F label="Company / Group Name"><input style={inp} value={settings.company_name} onChange={setS('company_name')}/></F>
              <F label="Default GST Rate (%)"><select style={sel} value={settings.default_gst_rate} onChange={setS('default_gst_rate')}><option value="5">5% Standard</option><option value="1">1% Affordable</option></select></F>
              <F label="TDS Rate on Brokerage (%)"><input style={inp} type="number" value={settings.tds_brokerage_rate} onChange={setS('tds_brokerage_rate')}/></F>
              <F label="Working Days per Month"><input style={inp} type="number" value={settings.working_days} onChange={setS('working_days')}/></F>
            </div>
          </div>
          <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'18px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize:12, fontWeight:700, color:'#0D1E35', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:14 }}>Email / SMTP Configuration</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
              <F label="SMTP Host"><input style={inp} value={settings.smtp_host} onChange={setS('smtp_host')} placeholder="smtp.office365.com"/></F>
              <F label="SMTP Port"><input style={inp} value={settings.smtp_port} onChange={setS('smtp_port')} placeholder="587"/></F>
              <F label="Email Username"><input style={inp} value={settings.smtp_user} onChange={setS('smtp_user')} placeholder="accounts@visiongrroup.in"/></F>
              <F label="App Password"><input style={inp} type="password" value={settings.smtp_pass} onChange={setS('smtp_pass')} placeholder="Microsoft 365 App Password"/></F>
            </div>
            <div style={{ marginTop:10, background:'#EAF0F8', borderRadius:8, padding:'9px 12px', fontSize:12, color:'#1E3A8A' }}>Go to Microsoft account → Security → App passwords to generate an app password for Outlook.</div>
          </div>
          <button onClick={()=>addToast('Settings saved.','success')} className="btn-primary" style={{ alignSelf:'flex-start', fontSize:13 }}>Save All Settings</button>
        </div>
      )}

      {/* USER MODAL */}
      <Modal open={userModal} onClose={()=>setUserModal(false)} title={editId?'Edit User':'Add User'} width="max-w-2xl"
        footer={<><button onClick={()=>setUserModal(false)} className="btn-secondary" style={{ fontSize:13 }}>Cancel</button><button onClick={saveUser} className="btn-primary" style={{ fontSize:13 }}>Save User</button></>}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
          <F label="Full Name" required span={2}><input style={inp} value={uForm.full_name} onChange={setU('full_name')} placeholder="Full name"/></F>
          <F label="Username" required><input style={inp} value={uForm.username} onChange={setU('username')} placeholder="Login username"/></F>
          <F label={editId?'New Password (blank = keep)':'Password'}><input style={inp} type="password" value={uForm.password} onChange={setU('password')} placeholder={editId?'Leave blank to keep':'Min 8 characters'}/></F>
          <F label="Role" required><select style={sel} value={uForm.role} onChange={setU('role')}>{ROLES.map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></F>
          <F label="Status"><select style={sel} value={uForm.is_active?'Active':'Inactive'} onChange={e=>setUForm(f=>({...f,is_active:e.target.value==='Active'}))}><option>Active</option><option>Inactive</option></select></F>
          <F label="Email"><input style={inp} value={uForm.email} onChange={setU('email')} placeholder="email@example.com"/></F>
          <F label="Phone"><input style={inp} value={uForm.phone} onChange={setU('phone')} placeholder="10-digit mobile"/></F>
        </div>
      </Modal>

      {/* BANK MODAL */}
      <Modal open={bankModal} onClose={()=>setBankModal(false)} title={editId?'Edit Bank Account':'Add Bank Account'}
        footer={<><button onClick={()=>setBankModal(false)} className="btn-secondary" style={{ fontSize:13 }}>Cancel</button><button onClick={saveBank} className="btn-primary" style={{ fontSize:13 }}>Save</button></>}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
          <F label="Bank Name" required span={2}><input style={inp} value={bForm.bank_name} onChange={setB('bank_name')} placeholder="e.g. State Bank of India"/></F>
          <F label="Branch"><input style={inp} value={bForm.branch} onChange={setB('branch')} placeholder="Branch name"/></F>
          <F label="Account Type"><select style={sel} value={bForm.account_type} onChange={setB('account_type')}><option>Current</option><option>Savings</option></select></F>
          <F label="Account Number"><input style={inp} value={bForm.account_no} onChange={setB('account_no')} placeholder="Account number"/></F>
          <F label="IFSC Code"><input style={inp} value={bForm.ifsc} onChange={setB('ifsc')} placeholder="e.g. SBIN0012345"/></F>
          <F label="Entity"><select style={sel} value={bForm.entity_code} onChange={setB('entity_code')}><option>VEH</option><option>VL</option><option>ME</option></select></F>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <input type="checkbox" id="primary" checked={bForm.is_primary} onChange={e=>setBForm(f=>({...f,is_primary:e.target.checked}))} style={{ width:15, height:15, cursor:'pointer' }}/>
            <label htmlFor="primary" style={{ fontSize:13, fontWeight:600, color:'#374151', cursor:'pointer' }}>Set as primary account</label>
          </div>
        </div>
      </Modal>

      {/* ENTITY MODAL */}
      <Modal open={entityModal} onClose={()=>setEntityModal(false)} title={editId?'Edit Entity':'Add Entity'} width="max-w-2xl"
        footer={<><button onClick={()=>setEntityModal(false)} className="btn-secondary" style={{ fontSize:13 }}>Cancel</button><button onClick={saveEntity} className="btn-primary" style={{ fontSize:13 }}>Save Entity</button></>}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
          <F label="Entity Code" required><input style={inp} value={eForm.code} onChange={setE('code')} placeholder="e.g. VEH"/></F>
          <F label="Full Legal Name" required><input style={inp} value={eForm.name} onChange={setE('name')} placeholder="Full registered name"/></F>
          <F label="GSTIN"><input style={inp} value={eForm.gstin} onChange={setE('gstin')} placeholder="27ABCDE1234F1Z5"/></F>
          <F label="PAN"><input style={inp} value={eForm.pan} onChange={setE('pan')} placeholder="ABCDE1234F"/></F>
          <F label="CIN / LLPIN"><input style={inp} value={eForm.cin_llpin} onChange={setE('cin_llpin')} placeholder="U70100MH2020PTC123456"/></F>
          <F label="Email"><input style={inp} value={eForm.email} onChange={setE('email')} placeholder="official@email.com"/></F>
          <F label="Phone"><input style={inp} value={eForm.phone} onChange={setE('phone')} placeholder="10-digit"/></F>
          <F label="Authorized Signatory"><input style={inp} value={eForm.authorized_signatory} onChange={setE('authorized_signatory')} placeholder="Name for documents"/></F>
          <F label="Designation"><select style={sel} value={eForm.designation} onChange={setE('designation')}><option>Director</option><option>Managing Director</option><option>Proprietor</option><option>Partner</option></select></F>
          <div/>
          <F label="Registered Address" span={2}><textarea style={{ ...inp, height:60, resize:'vertical' }} value={eForm.address} onChange={setE('address')} placeholder="Registered office address"/></F>
        </div>
      </Modal>
    </div>
  );
}
