import React, { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { USERS as SEED_USERS } from '../data';
import { Eye, EyeOff, LogIn, Building2, Lock } from 'lucide-react';

export default function Login() {
  const { setUser, setActiveEntity, setAvailableEntities, addToast, users: storeUsers, entities } = useAppStore();

  // Use store entities (loaded from vg_global.json) — fallback to empty array
  const allEntities = (entities && entities.length > 0) ? entities : [];

  const [selEntityId, setSelEntityId] = useState('');
  const [form, setForm]   = useState({ username:'', password:'' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep]   = useState('entity');

  function handleEntitySelect() {
    if (!selEntityId) { setError('Please select an entity.'); return; }
    setError(''); setStep('credentials');
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!form.username||!form.password) { setError('Enter username and password.'); return; }
    setLoading(true); setError('');
    try {
      let user = null;

      // 1. Try SQLite auth (Electron)
      if (window.vgERP?.db?.login) {
        const res = await window.vgERP.db.login({ username:form.username, password:form.password });
        if (res.ok) {
          user = res.user;
          if (typeof user.entity_access==='string') {
            try { user.entity_access = JSON.parse(user.entity_access); } catch { user.entity_access=[1,2,3]; }
          }
        } else {
          // SQLite says no — fall through to in-memory checks
        }
      }

      // 2. Check store users (added via AdminSetup — highest priority after SQLite)
      if (!user && storeUsers && storeUsers.length > 0) {
        const found = storeUsers.find(u =>
          u.username === form.username &&
          u.password === form.password &&
          u.is_active !== false
        );
        if (found) user = { ...found };
      }

      // 3. Fallback: seed users from data.js (admin/director)
      if (!user) {
        const found = SEED_USERS.find(u =>
          u.username === form.username && u.password === form.password && u.is_active !== false
        );
        if (found) user = { ...found };
      }

      if (!user) {
        setError('Invalid username or password.');
        setLoading(false); return;
      }

      const entity = allEntities.find(e => e.id === Number(selEntityId));
      if (!entity) { setError('Invalid entity. Please log out and try again.'); setLoading(false); return; }

      // Parse entity_access — handle both array and JSON string
      let entityAccess = user.entity_access;
      if (typeof entityAccess === 'string') {
        try { entityAccess = JSON.parse(entityAccess); } catch { entityAccess = []; }
      }
      // Super admin and director can always access all entities
      const isAdmin = user.role === 'super_admin' || user.role === 'director';
      const hasAccess = isAdmin || (Array.isArray(entityAccess) && entityAccess.includes(entity.id));
      if (!hasAccess) {
        setError(`You do not have access to ${entity.name}. Contact your administrator.`);
        setLoading(false); return;
      }

      const available = isAdmin ? allEntities : allEntities.filter(e => (entityAccess||[]).includes(e.id));
      setAvailableEntities(available);
      setActiveEntity(entity);
      setUser(user);
      addToast(`Welcome, ${user.full_name}! Logged into ${entity.code}.`);
    } catch(err) {
      setError('Login error: ' + err.message);
    }
    setLoading(false);
  }

  const inp = { width:'100%', border:'1px solid #D1D5DB', borderRadius:8, padding:'8px 12px', fontSize:13.5, color:'#111827', background:'#fff', outline:'none', fontFamily:'Inter,system-ui,sans-serif' };

  return (
    <div style={{ height:'100vh', background:'#0D1E35', display:'flex' }}>
      {/* Left branding */}
      <div style={{ width:'42%', display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'48px 44px', background:'#07101E' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <img src="/assets/icon.png" alt="" style={{ width:40, height:40, objectFit:'contain' }} onError={e=>e.target.style.display='none'}/>
          <div>
            <div style={{ color:'#F0C040', fontWeight:800, fontSize:18 }}>Vision Grroup</div>
            <div style={{ color:'rgba(255,255,255,0.3)', fontSize:11, textTransform:'uppercase', letterSpacing:1.2 }}>Real Estate ERP v4.0</div>
          </div>
        </div>
        <div>
          <h2 style={{ color:'#fff', fontSize:26, fontWeight:800, lineHeight:1.4, margin:'0 0 18px' }}>
            Manage every project,<br/>every allottee,<br/>every rupee.
          </h2>
          {['13 integrated modules','SQLite persistent data','Multi-entity support','Full audit trail'].map(f=>(
            <div key={f} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'rgba(255,255,255,0.5)', marginBottom:8 }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#C9951E', flexShrink:0 }}/>
              {f}
            </div>
          ))}
        </div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.2)' }}>© 2026 Vision Grroup. All rights reserved.</div>
      </div>

      {/* Right login */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:32, background:'#fff' }}>
        <div style={{ width:'100%', maxWidth:380 }}>

          {step==='entity' && (<>
            <div style={{ marginBottom:24 }}>
              <h1 style={{ fontSize:22, fontWeight:800, color:'#0D1E35', margin:'0 0 6px' }}>Select Entity</h1>
              <p style={{ fontSize:13, color:'#6B7280', margin:0 }}>Choose your working entity. Cannot switch without logging out.</p>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:18 }}>
              {allEntities.map(en=>(
                <div key={en.id} onClick={()=>{ setSelEntityId(String(en.id)); setError(''); }}
                  style={{ padding:'13px 16px', border:`2px solid ${selEntityId===String(en.id)?'#0D1E35':'#E5E7EB'}`, borderRadius:12, cursor:'pointer', background:selEntityId===String(en.id)?'#EAF0F8':'#fff', display:'flex', alignItems:'center', gap:12 }}>
                  <Building2 size={16} style={{ color:selEntityId===String(en.id)?'#0D1E35':'#9CA3AF', flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#0D1E35' }}>{en.name}</div>
                    <div style={{ fontSize:11, color:'#6B7280', fontFamily:'monospace' }}>{en.code}</div>
                  </div>
                  {selEntityId===String(en.id) && <div style={{ width:16, height:16, borderRadius:'50%', background:'#0D1E35', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:6, height:6, borderRadius:'50%', background:'#F0C040' }}/></div>}
                </div>
              ))}
            </div>
            {error && <div style={{ background:'#FEE2E2', border:'1px solid #FCA5A5', borderRadius:8, padding:'8px 12px', marginBottom:12, fontSize:12, color:'#7F1D1D' }}>{error}</div>}
            <button onClick={handleEntitySelect}
              style={{ width:'100%', background:'#0D1E35', color:'#fff', border:'none', borderRadius:10, padding:'11px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
              Continue →
            </button>
          </>)}

          {step==='credentials' && (<>
            <div style={{ marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, background:'#EAF0F8', border:'1px solid #C5D5E8', borderRadius:8, padding:'8px 12px', marginBottom:18 }}>
                <Lock size={12} style={{ color:'#0D1E35' }}/>
                <span style={{ fontSize:12.5, fontWeight:700, color:'#0D1E35' }}>
                  {allEntities.find(e=>e.id===Number(selEntityId))?.code} — {allEntities.find(e=>e.id===Number(selEntityId))?.name}
                </span>
                <button onClick={()=>{ setStep('entity'); setError(''); }}
                  style={{ marginLeft:'auto', fontSize:11, color:'#1D4ED8', fontWeight:600, background:'none', border:'none', cursor:'pointer' }}>Change</button>
              </div>
              <h1 style={{ fontSize:22, fontWeight:800, color:'#0D1E35', margin:'0 0 4px' }}>Sign in</h1>
              <p style={{ fontSize:13, color:'#6B7280', margin:0 }}>Enter your credentials</p>
            </div>
            <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:13 }}>
              <div>
                <label style={{ display:'block', fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>Username</label>
                <input style={inp} placeholder="Username" autoFocus value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))}/>
              </div>
              <div>
                <label style={{ display:'block', fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>Password</label>
                <div style={{ position:'relative' }}>
                  <input style={{ ...inp, paddingRight:40 }} type={showPw?'text':'password'} placeholder="Password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/>
                  <button type="button" onClick={()=>setShowPw(v=>!v)}
                    style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF' }}>
                    {showPw?<EyeOff size={15}/>:<Eye size={15}/>}
                  </button>
                </div>
              </div>
              {error && <div style={{ background:'#FEE2E2', border:'1px solid #FCA5A5', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#7F1D1D' }}>{error}</div>}
              <button type="submit" disabled={loading}
                style={{ width:'100%', background:'#0D1E35', color:'#fff', border:'none', borderRadius:10, padding:'11px', fontSize:14, fontWeight:700, cursor:'pointer', opacity:loading?0.6:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:4 }}>
                <LogIn size={15}/> {loading?'Signing in…':'Sign in'}
              </button>
            </form>
            <div style={{ marginTop:16, background:'#FEF3C7', border:'1px solid #FCD34D', borderRadius:9, padding:'10px 14px', fontSize:11.5, fontFamily:'monospace', color:'#78350F' }}>
              admin / Admin@1234 &nbsp;(Super Admin)<br/>
              director / Director@1234 &nbsp;(Director)<br/>
              <span style={{ fontFamily:'sans-serif', fontSize:11, color:'#92400E' }}>Other users: add via Admin Setup → Users</span>
            </div>
          </>)}
        </div>
      </div>
    </div>
  );
}
