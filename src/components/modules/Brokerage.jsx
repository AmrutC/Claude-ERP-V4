import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { VALIDATE } from '../../data';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { inr, fmtDate } from '../../utils';
import { Plus, Search, Edit2, Phone, Mail, CheckCircle2 } from 'lucide-react';

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

const EMPTY_BROKER = {
  firm_name:'', contact_person:'', phone:'', email:'', pan:'',
  gstin:'', rera_no:'', address:'', tds_rate:5, status:'Active',
};

let brokerCtr = 2;

function validateBroker(f) {
  const e = {};
  if (!f.firm_name.trim())       e.firm_name      = 'Firm / broker name is required.';
  if (!f.contact_person.trim())  e.contact_person = 'Contact person name is required.';
  if (!VALIDATE.phone(f.phone))  e.phone          = VALIDATE.phoneMsg;
  if (!VALIDATE.email(f.email))  e.email          = 'Email is mandatory. ' + VALIDATE.emailMsg;
  if (!VALIDATE.pan(f.pan))      e.pan            = VALIDATE.panMsg;
  if (!f.address.trim())         e.address        = 'Address is mandatory.';
  return e;
}

export default function Brokerage() {
  const { activeEntity, brokers, setBrokers, bookings, addToast } = useAppStore();
  const entityBrokers = (brokers||[]).filter(b => b.entity_id === activeEntity?.id);

  const [tab, setTab]         = useState('master');
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState(EMPTY_BROKER);
  const [editId, setEditId]   = useState(null);
  const [errors, setErrors]   = useState({});
  const [search, setSearch]   = useState('');
  const [selBroker, setSelBroker] = useState(null);

  const set = k => e => { setForm(f=>({...f,[k]:e.target.value})); setErrors(er=>({...er,[k]:''})); };

  function openNew() { setForm(EMPTY_BROKER); setEditId(null); setErrors({}); setModal(true); }
  function openEdit(b) { setForm({...b}); setEditId(b.id); setErrors({}); setModal(true); }

  function save() {
    const errs = validateBroker(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    if (editId) {
      setBrokers(bs=>bs.map(b=>b.id===editId?{...b,...form}:b));
      if (selBroker?.id===editId) setSelBroker(b=>({...b,...form}));
      addToast('Broker updated.','success');
    } else {
      brokerCtr++;
      const nb = { ...form, id:brokerCtr, entity_id:activeEntity?.id, pan:form.pan.toUpperCase() };
      setBrokers(bs=>[...bs,nb]);
      addToast('Broker registered.','success');
    }
    setModal(false); setErrors({});
  }

  // Get payouts for each broker from bookings
  function getBrokerPayouts(broker) {
    return (bookings||[]).filter(b =>
      b.entity_id === activeEntity?.id &&
      b.broker_id === broker.id &&
      b.approval_status === 'Approved' &&
      b.brokerage_amount > 0
    ).map(b => ({
      booking_no: b.booking_no,
      unit_no:    b.unit_no,
      allottee:   b.allottees?.[0]?.name,
      agreement_value: b.agreement_value,
      gross_brokerage: b.brokerage_amount,
      tds: Math.round(b.brokerage_amount * (broker.tds_rate||5) / 100),
      net_brokerage: b.brokerage_amount - Math.round(b.brokerage_amount * (broker.tds_rate||5) / 100),
      paid: false,
    }));
  }

  const filtered = entityBrokers.filter(b =>
    !search ||
    b.firm_name.toLowerCase().includes(search.toLowerCase()) ||
    b.contact_person.toLowerCase().includes(search.toLowerCase()) ||
    b.phone.includes(search)
  );

  const selPayouts = selBroker ? getBrokerPayouts(selBroker) : [];
  const totalGross = selPayouts.reduce((s,p)=>s+p.gross_brokerage,0);
  const totalTDS   = selPayouts.reduce((s,p)=>s+p.tds,0);
  const totalNet   = selPayouts.reduce((s,p)=>s+p.net_brokerage,0);

  return (
    <div>
      {/* Tabs */}
      <div style={{ display:'flex', gap:3, background:'#F3F4F6', borderRadius:10, padding:3, marginBottom:14, width:'fit-content' }}>
        {[['master','Broker Master'],['payouts','Payout Register']].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{ padding:'6px 18px', borderRadius:7, fontSize:12.5, fontWeight:tab===id?700:500, color:tab===id?'#0D1E35':'#6B7280', background:tab===id?'#fff':'transparent', cursor:'pointer', border:tab===id?'1px solid #E5E7EB':'1px solid transparent' }}>
            {label}
          </button>
        ))}
      </div>

      {/* BROKER MASTER */}
      {tab==='master' && (
        <div>
          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
            <div style={{ flex:1, position:'relative' }}>
              <Search size={12} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }}/>
              <input style={{ ...inp, paddingLeft:30 }} placeholder="Search brokers…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <button onClick={openNew} className="btn-primary" style={{ fontSize:12.5 }}><Plus size={13}/> Register Broker</button>
          </div>

          {filtered.length===0 ? (
            <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:60, textAlign:'center' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>🤝</div>
              <div style={{ fontSize:14, fontWeight:600, color:'#6B7280' }}>No brokers registered yet</div>
              <div style={{ fontSize:12, color:'#9CA3AF', marginTop:4 }}>Registered brokers will appear in the Booking form Step 4</div>
            </div>
          ) : filtered.map(b=>{
            const payouts = getBrokerPayouts(b);
            return (
              <div key={b.id} style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'16px 18px', marginBottom:10, boxShadow:'0 1px 3px rgba(0,0,0,0.04)', cursor:'pointer' }}
                onClick={()=>{ setSelBroker(b); setTab('payouts'); }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:800, color:'#0D1E35', marginBottom:3 }}>{b.firm_name}</div>
                    <div style={{ fontSize:12.5, color:'#374151', marginBottom:2 }}>{b.contact_person}</div>
                    <div style={{ display:'flex', gap:12, fontSize:12, color:'#4B5563', flexWrap:'wrap' }}>
                      <span style={{ display:'flex', alignItems:'center', gap:4 }}><Phone size={11}/>{b.phone}</span>
                      <span style={{ display:'flex', alignItems:'center', gap:4 }}><Mail size={11}/>{b.email}</span>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <Badge value={b.status}/>
                    <button onClick={e=>{ e.stopPropagation(); openEdit(b); }} style={{ background:'#F3F4F6', border:'1px solid #E5E7EB', borderRadius:7, padding:'4px 10px', cursor:'pointer', fontSize:11.5, fontWeight:600, color:'#374151', display:'flex', alignItems:'center', gap:4 }}><Edit2 size={10}/> Edit</button>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
                  {[['PAN',b.pan||'—'],['RERA No.',b.rera_no||'—'],['TDS Rate',`${b.tds_rate||5}% (u/s 194H)`],['Bookings',String(payouts.length)],['Total Brokerage (Gross)',inr(payouts.reduce((s,p)=>s+p.gross_brokerage,0),true)]].map(([l,v])=>(
                    <div key={l} style={{ background:'#F8FAFC', borderRadius:8, padding:'8px 10px' }}>
                      <div style={{ fontSize:9.5, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:2 }}>{l}</div>
                      <div style={{ fontSize:12.5, fontWeight:700, color:'#0D1E35', fontFamily:l==='PAN'||l==='RERA No.'?'monospace':'inherit' }}>{v}</div>
                    </div>
                  ))}
                </div>
                {b.address && <div style={{ marginTop:8, fontSize:12, color:'#4B5563' }}>{b.address}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* PAYOUT REGISTER */}
      {tab==='payouts' && (
        <div>
          <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center' }}>
            <select style={{ ...sel, width:260 }} value={selBroker?.id||''} onChange={e=>setSelBroker(entityBrokers.find(b=>b.id===Number(e.target.value))||null)}>
              <option value="">— Select broker —</option>
              {entityBrokers.map(b=><option key={b.id} value={b.id}>{b.firm_name}</option>)}
            </select>
          </div>

          {selBroker && (<>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
              {[['Gross Brokerage',inr(totalGross,true),'#78350F','#FEF3C7','#FCD34D'],['TDS (u/s 194H)',inr(totalTDS,true),'#4C1D95','#EDE9FE','#C4B5FD'],['Net Payable',inr(totalNet,true),'#14532D','#DCFCE7','#86EFAC'],['Total Bookings',String(selPayouts.length),'#0D1E35','#EAF0F8','#C5D5E8']].map(([l,v,tc,bg,bdr])=>(
                <div key={l} style={{ background:bg, border:`1px solid ${bdr}`, borderRadius:12, padding:'12px 16px' }}>
                  <div style={{ fontSize:9.5, fontWeight:700, color:tc, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>{l}</div>
                  <div style={{ fontSize:18, fontWeight:800, color:tc, fontFamily:'monospace' }}>{v}</div>
                </div>
              ))}
            </div>

            {selPayouts.length===0 ? (
              <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:40, textAlign:'center', color:'#9CA3AF', fontSize:13 }}>No approved bookings found for {selBroker.firm_name}.</div>
            ) : (
              <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr style={{ background:'#F9FAFB', borderBottom:'2px solid #E5E7EB' }}>
                    {['Booking No.','Unit','Allottee','Agreement Value','Gross Brokerage',`TDS (${selBroker.tds_rate||5}% u/s 194H)`,'Net Payable','Payout Status'].map(h=>(
                      <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.4px', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {selPayouts.map((p,i)=>(
                      <tr key={i} style={{ borderBottom:'1px solid #F3F4F6', background:i%2===0?'#fff':'#FAFAFA' }}>
                        <td style={{ padding:'9px 12px', fontSize:11.5, fontFamily:'monospace', fontWeight:700, color:'#0D1E35' }}>{p.booking_no}</td>
                        <td style={{ padding:'9px 12px', fontSize:12.5, fontWeight:600, color:'#1D4ED8' }}>Unit {p.unit_no}</td>
                        <td style={{ padding:'9px 12px', fontSize:12.5, color:'#374151' }}>{p.allottee}</td>
                        <td style={{ padding:'9px 12px', fontSize:12, fontFamily:'monospace', textAlign:'right', color:'#374151' }}>{inr(p.agreement_value)}</td>
                        <td style={{ padding:'9px 12px', fontSize:12.5, fontFamily:'monospace', textAlign:'right', fontWeight:700, color:'#78350F' }}>{inr(p.gross_brokerage)}</td>
                        <td style={{ padding:'9px 12px', fontSize:12, fontFamily:'monospace', textAlign:'right', color:'#4C1D95' }}>-{inr(p.tds)}</td>
                        <td style={{ padding:'9px 12px', fontSize:13, fontFamily:'monospace', textAlign:'right', fontWeight:800, color:'#14532D' }}>{inr(p.net_brokerage)}</td>
                        <td style={{ padding:'9px 12px' }}><Badge value="Pending"/></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background:'#0D1E35' }}>
                      <td colSpan={4} style={{ padding:'9px 12px', fontSize:12, fontWeight:800, color:'#fff' }}>TOTAL</td>
                      <td style={{ padding:'9px 12px', fontSize:13, fontFamily:'monospace', textAlign:'right', fontWeight:800, color:'#FEF3C7' }}>{inr(totalGross)}</td>
                      <td style={{ padding:'9px 12px', fontSize:13, fontFamily:'monospace', textAlign:'right', fontWeight:800, color:'#C4B5FD' }}>{inr(totalTDS)}</td>
                      <td style={{ padding:'9px 12px', fontSize:13, fontFamily:'monospace', textAlign:'right', fontWeight:800, color:'#86EFAC' }}>{inr(totalNet)}</td>
                      <td/>
                    </tr>
                  </tfoot>
                </table>
                <div style={{ padding:'11px 14px', background:'#FEF3C7', borderTop:'1px solid #FCD34D', fontSize:12, color:'#78350F' }}>
                  TDS certificate (Form 16A) will be issued quarterly. PAN of broker: <strong style={{ fontFamily:'monospace' }}>{selBroker.pan}</strong>
                </div>
              </div>
            )}
          </>)}
        </div>
      )}

      {/* BROKER MODAL */}
      <Modal open={modal} onClose={()=>{ setModal(false); setErrors({}); }}
        title={editId?'Edit Broker':'Register Broker'} width="max-w-2xl"
        footer={<><button onClick={()=>{ setModal(false); setErrors({}); }} className="btn-secondary" style={{ fontSize:13 }}>Cancel</button><button onClick={save} className="btn-primary" style={{ fontSize:13 }}>Save Broker</button></>}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
          <F label="Firm / Broker Name" required error={errors.firm_name}><input style={errors.firm_name?inpE:inp} value={form.firm_name} onChange={set('firm_name')} placeholder="Firm or individual broker name"/></F>
          <F label="Contact Person Name" required error={errors.contact_person}><input style={errors.contact_person?inpE:inp} value={form.contact_person} onChange={set('contact_person')} placeholder="Contact person"/></F>
          <F label="Mobile Number" required error={errors.phone}><input style={errors.phone?inpE:inp} value={form.phone} onChange={set('phone')} placeholder="10-digit mobile" maxLength={10}/></F>
          <F label="Email Address" required error={errors.email}><input style={errors.email?inpE:inp} value={form.email} onChange={set('email')} placeholder="email@domain.com"/></F>
          <F label="PAN Number" required error={errors.pan}><input style={errors.pan?inpE:inp} value={form.pan} onChange={e=>{ setForm(f=>({...f,pan:e.target.value.toUpperCase()})); setErrors(er=>({...er,pan:''})); }} placeholder="ABCDE1234F" maxLength={10}/></F>
          <F label="GSTIN (if registered)"><input style={inp} value={form.gstin} onChange={set('gstin')} placeholder="15-char GSTIN"/></F>
          <F label="MahaRERA Broker Reg. No."><input style={inp} value={form.rera_no} onChange={set('rera_no')} placeholder="A51800XXXXXX"/></F>
          <F label="TDS Rate (%) u/s 194H"><select style={sel} value={form.tds_rate} onChange={set('tds_rate')}><option value={5}>5% (Default)</option><option value={2}>2%</option><option value={0}>0% (Threshold)</option></select></F>
          <F label="Status"><select style={sel} value={form.status} onChange={set('status')}><option>Active</option><option>Inactive</option></select></F>
          <div/>
          <F label="Full Address" required error={errors.address} span={2}><textarea style={{ ...(errors.address?inpE:inp), height:60, resize:'vertical' }} value={form.address} onChange={set('address')} placeholder="Complete address with PIN code"/></F>
          <div style={{ gridColumn:'1/-1', background:'#EAF0F8', border:'1px solid #C5D5E8', borderRadius:9, padding:'9px 13px', fontSize:12, color:'#1E3A8A' }}>
            This broker will appear in the Booking form's broker dropdown once registered and marked Active.
          </div>
        </div>
      </Modal>
    </div>
  );
}
