import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { fmtDate } from '../../utils';
import { Mail, MessageSquare, Send, Settings, Search, CheckCircle2 } from 'lucide-react';

const DEMO_ALLOTTEES = [];
const DEMO_LOG = [];
const EMAIL_TEMPLATES = [
  { id:1, name:'Payment Receipt',     subject:'Payment Receipt — {{receipt_no}} | {{project_name}}',  body:'Dear {{allottee_name}},\n\nPlease find attached your payment receipt {{receipt_no}} for ₹{{amount}} towards your flat {{flat_no}} at {{project_name}}.\n\nThank you for your payment.\n\nRegards,\nVision Grroup' },
  { id:2, name:'Demand Notice',       subject:'Payment Due — {{demand_no}} | {{flat_no}} | {{project_name}}', body:'Dear {{allottee_name}},\n\nThis is a reminder that a payment of ₹{{amount}} is due by {{due_date}} for {{milestone}} of your flat {{flat_no}}.\n\nKindly arrange payment at the earliest.\n\nRegards,\nVision Grroup' },
  { id:3, name:'Booking Confirmation',subject:'Booking Confirmation — {{flat_no}} | {{project_name}}', body:'Dear {{allottee_name}},\n\nWe are pleased to confirm your booking for Flat {{flat_no}} at {{project_name}}.\n\nWe will share the allotment letter shortly.\n\nRegards,\nVision Grroup' },
];

const inp = { width:'100%', border:'1px solid #D1D5DB', borderRadius:8, padding:'7px 10px', fontSize:13, color:'#111827', background:'#fff', outline:'none', fontFamily:'Inter,system-ui,sans-serif' };
const sel = { ...inp, cursor:'pointer' };
const F = ({ label, children, span }) => (
  <div style={{ gridColumn: span ? `span ${span}` : '' }}>
    <label style={{ display:'block', fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>{label}</label>
    {children}
  </div>
);

const TABS = [['compose','Compose Email'],['log','Email Log'],['whatsapp','WhatsApp Share'],['config','Email Config']];

export default function Communication() {
  const { addToast } = useAppStore();
  const [tab, setTab] = useState('compose');
  const [log, setLog] = useState([]);
  const [composeForm, setComposeForm] = useState({ to:'', allottee:'', subject:'', body:'' });
  const [config, setConfig] = useState({ smtp_host:'smtp.office365.com', smtp_port:'587', smtp_user:'', smtp_pass:'', from_name:'Vision Grroup', from_email:'' });
  const [waAllottee, setWaAllottee] = useState('');
  const [waDoc, setWaDoc] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');

  const setC = k => e => setComposeForm(f=>({...f,[k]:e.target.value}));
  const setCfg = k => e => setConfig(f=>({...f,[k]:e.target.value}));

  function loadTemplate(t) {
    const allottee = DEMO_ALLOTTEES.find(a=>a.email===composeForm.to)||DEMO_ALLOTTEES[0];
    const subject = t.subject.replace('{{allottee_name}}',allottee.name).replace('{{flat_no}}',allottee.flat).replace('{{project_name}}','Vision Harmony').replace(/\{\{[^}]+\}\}/g,'[...]');
    const body    = t.body.replace(/\{\{allottee_name\}\}/g,allottee.name).replace(/\{\{flat_no\}\}/g,allottee.flat).replace(/\{\{project_name\}\}/g,'Vision Harmony').replace(/\{\{[^}]+\}\}/g,'[fill in]');
    setComposeForm(f=>({...f,subject,body}));
  }

  function sendEmail() {
    if (!composeForm.to||!composeForm.subject||!composeForm.body) { alert('Fill in To, Subject and Body.'); return; }
    setSending(true);
    setTimeout(()=>{
      const allottee = DEMO_ALLOTTEES.find(a=>a.email===composeForm.to);
      setLog(l=>[{id:Date.now(),date:new Date().toISOString().slice(0,10),to:composeForm.to,allottee:allottee?.name||composeForm.to,subject:composeForm.subject,type:'Manual',status:'Delivered'},...l]);
      addToast(`Email sent to ${composeForm.to}`,'success');
      setComposeForm({to:'',allottee:'',subject:'',body:''});
      setSending(false);
    },1200);
  }

  function sendWhatsApp() {
    if (!waAllottee) { alert('Select allottee.'); return; }
    const a = DEMO_ALLOTTEES.find(x=>String(x.id)===waAllottee);
    if (!a) return;
    const msg = encodeURIComponent(`Dear ${a.name},\nPlease find attached your document from Vision Grroup for Flat ${a.flat}.\n\nFor any queries, please contact us.\n\nRegards,\nVision Grroup`);
    const phone = a.phone.replace(/[^0-9]/g,'');
    window.open(`https://wa.me/91${phone}?text=${msg}`,'_blank');
    addToast('WhatsApp opened in browser.','info');
  }

  const filtered = log.filter(l=>!search||l.subject.toLowerCase().includes(search.toLowerCase())||l.allottee.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      {/* Tabs */}
      <div style={{display:'flex',gap:3,background:'#F3F4F6',borderRadius:10,padding:3,marginBottom:16,width:'fit-content'}}>
        {TABS.map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:'6px 16px',borderRadius:7,fontSize:12.5,fontWeight:tab===id?700:500,color:tab===id?'#0D1E35':'#6B7280',background:tab===id?'#fff':'transparent',cursor:'pointer',boxShadow:tab===id?'0 1px 3px rgba(0,0,0,0.1)':'',border:'none'}}>
            {label}
          </button>
        ))}
      </div>

      {/* COMPOSE */}
      {tab==='compose'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:16}}>
          <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:14,padding:'18px 20px',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
            <div style={{fontSize:12,fontWeight:700,color:'#0D1E35',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:14}}>Compose Email</div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <F label="To (Email Address)">
                <select style={sel} value={composeForm.to} onChange={e=>setComposeForm(f=>({...f,to:e.target.value}))}>
                  <option value="">— Select allottee —</option>
                  {DEMO_ALLOTTEES.filter(a=>a.email).map(a=><option key={a.id} value={a.email}>{a.name} ({a.flat}) — {a.email}</option>)}
                  <option value="__custom">Enter custom email…</option>
                </select>
                {composeForm.to==='__custom'&&<input style={{...inp,marginTop:6}} placeholder="Enter email address" onChange={e=>setComposeForm(f=>({...f,to:e.target.value}))}/>}
              </F>
              <F label="Subject">
                <input style={inp} value={composeForm.subject} onChange={setC('subject')} placeholder="Email subject"/>
              </F>
              <F label="Message Body">
                <textarea style={{...inp,height:200,resize:'vertical'}} value={composeForm.body} onChange={setC('body')} placeholder="Email body…"/>
              </F>
              <button onClick={sendEmail} disabled={sending}
                style={{background:'#0D1E35',color:'#fff',border:'none',borderRadius:9,padding:'9px 20px',cursor:'pointer',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',gap:7,alignSelf:'flex-start',opacity:sending?0.6:1}}>
                <Send size={14}/>{sending?'Sending…':'Send Email'}
              </button>
            </div>
          </div>

          {/* Templates */}
          <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:14,padding:'16px 18px',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
            <div style={{fontSize:12,fontWeight:700,color:'#0D1E35',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:12}}>Email Templates</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {EMAIL_TEMPLATES.map(t=>(
                <div key={t.id} style={{padding:'10px 12px',border:'1px solid #E5E7EB',borderRadius:10,cursor:'pointer'}}
                  onClick={()=>loadTemplate(t)}>
                  <div style={{fontSize:13,fontWeight:700,color:'#0D1E35',marginBottom:3}}>{t.name}</div>
                  <div style={{fontSize:11,color:'#6B7280',lineHeight:1.4}}>{t.subject.slice(0,50)}…</div>
                  <div style={{marginTop:6,fontSize:11,color:'#1E3A8A',fontWeight:600}}>Click to load template →</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* EMAIL LOG */}
      {tab==='log'&&(<>
        <div style={{display:'flex',gap:10,marginBottom:14}}>
          <div style={{flex:1,position:'relative'}}>
            <Search size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#9CA3AF'}}/>
            <input style={{...inp,paddingLeft:32}} placeholder="Search subject or allottee…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>
        <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:14,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#F9FAFB',borderBottom:'2px solid #E5E7EB'}}>
              {['Date','To','Allottee','Subject','Type','Status'].map(h=>(
                <th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'#4B5563',textTransform:'uppercase',letterSpacing:'0.5px',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.length===0?<tr><td colSpan={6} style={{textAlign:'center',padding:40,color:'#9CA3AF',fontSize:13}}>No emails sent yet.</td></tr>:
              filtered.map((l,i)=>(
                <tr key={l.id} style={{borderBottom:'1px solid #F3F4F6',background:i%2===0?'#fff':'#FAFAFA'}}>
                  <td style={{padding:'9px 14px',fontSize:12.5,color:'#374151'}}>{fmtDate(l.date)}</td>
                  <td style={{padding:'9px 14px',fontSize:12,fontFamily:'monospace',color:'#374151'}}>{l.to}</td>
                  <td style={{padding:'9px 14px',fontSize:13,fontWeight:600,color:'#0D1E35'}}>{l.allottee}</td>
                  <td style={{padding:'9px 14px',fontSize:12.5,color:'#111827'}}>{l.subject}</td>
                  <td style={{padding:'9px 14px'}}><span style={{background:'#EDE9FE',color:'#4C1D95',fontSize:10.5,fontWeight:700,padding:'2px 7px',borderRadius:10}}>{l.type}</span></td>
                  <td style={{padding:'9px 14px'}}>
                    <span style={{display:'flex',alignItems:'center',gap:5,fontSize:12,fontWeight:600,color:'#14532D'}}>
                      <CheckCircle2 size={12}/>{l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>)}

      {/* WHATSAPP */}
      {tab==='whatsapp'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:14,padding:'18px 20px',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
            <div style={{fontSize:12,fontWeight:700,color:'#0D1E35',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:14}}>Share via WhatsApp</div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <F label="Select Allottee">
                <select style={sel} value={waAllottee} onChange={e=>setWaAllottee(e.target.value)}>
                  <option value="">— Select allottee —</option>
                  {DEMO_ALLOTTEES.map(a=><option key={a.id} value={a.id}>{a.name} ({a.flat}) — +91 {a.phone}</option>)}
                </select>
              </F>
              <F label="Document Type">
                <select style={sel} value={waDoc} onChange={e=>setWaDoc(e.target.value)}>
                  <option value="">— Select document type —</option>
                  <option>Payment Receipt (RCP)</option>
                  <option>Demand Notice (DMD)</option>
                  <option>Booking Acknowledgement (BKG)</option>
                  <option>Allotment Letter (ALT)</option>
                </select>
              </F>
              <button onClick={sendWhatsApp}
                style={{background:'#25D366',color:'#fff',border:'none',borderRadius:9,padding:'9px 20px',cursor:'pointer',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',gap:7,alignSelf:'flex-start'}}>
                <MessageSquare size={14}/> Open WhatsApp
              </button>
            </div>
          </div>
          <div style={{background:'#F0FDF4',border:'1px solid #86EFAC',borderRadius:14,padding:'18px 20px'}}>
            <div style={{fontSize:13,fontWeight:700,color:'#14532D',marginBottom:8}}>How WhatsApp sharing works</div>
            <div style={{fontSize:12.5,color:'#374151',lineHeight:1.8}}>
              1. Select the allottee and document type above<br/>
              2. Click "Open WhatsApp" — this opens WhatsApp Web / App with a pre-filled message<br/>
              3. Attach the PDF from the <strong style={{fontFamily:'monospace'}}>OneDrive/documents/</strong> folder manually<br/>
              4. Send from your phone<br/><br/>
              <span style={{color:'#6B7280',fontSize:11.5}}>Phase 2 will integrate WhatsApp Business API for automated PDF delivery.</span>
            </div>
          </div>
        </div>
      )}

      {/* CONFIG */}
      {tab==='config'&&(
        <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:14,padding:'20px',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
          <div style={{fontSize:12,fontWeight:700,color:'#0D1E35',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:14}}>Email Configuration (Outlook / Microsoft 365)</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:13}}>
            <F label="SMTP Host"><input style={inp} value={config.smtp_host} onChange={setCfg('smtp_host')} placeholder="smtp.office365.com"/></F>
            <F label="SMTP Port"><input style={inp} value={config.smtp_port} onChange={setCfg('smtp_port')} placeholder="587"/></F>
            <F label="Email Username"><input style={inp} value={config.smtp_user} onChange={setCfg('smtp_user')} placeholder="accounts@visiongrroup.in"/></F>
            <F label="App Password"><input style={inp} type="password" value={config.smtp_pass} onChange={setCfg('smtp_pass')} placeholder="Microsoft 365 App Password"/></F>
            <F label="From Name"><input style={inp} value={config.from_name} onChange={setCfg('from_name')} placeholder="Vision Grroup"/></F>
            <F label="From Email"><input style={inp} value={config.from_email} onChange={setCfg('from_email')} placeholder="noreply@visiongrroup.in"/></F>
          </div>
          <div style={{marginTop:14,background:'#EAF0F8',borderRadius:8,padding:'10px 12px',fontSize:12,color:'#1E3A8A',lineHeight:1.6}}>
            <strong>Setup steps:</strong> Sign in to portal.office.com → Account Settings → Security → App passwords → Generate new → Use that password here. Do NOT use your regular Microsoft 365 password.
          </div>
          <button onClick={()=>addToast('Email config saved.','success')} className="btn-primary" style={{marginTop:14,fontSize:13}}>Save Configuration</button>
        </div>
      )}
    </div>
  );
}
