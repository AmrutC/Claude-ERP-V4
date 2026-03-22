import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { inr, fmtDate } from '../../utils';
import { Plus, Search, Edit2, FileText, CheckCircle2 } from 'lucide-react';

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

const TDS_SECTIONS = [
  { code:'194C', label:'194C — Contractor / Sub-contractor', rate:2 },
  { code:'194J', label:'194J — Professional / Technical fees', rate:10 },
  { code:'194I', label:'194I — Rent', rate:10 },
  { code:'194H', label:'194H — Commission / Brokerage', rate:5 },
  { code:'Other',label:'Other', rate:0 },
];
const GST_RATES = [5,12,18,28];

const EMPTY_VENDOR = { name:'', type:'Contractor', phone:'', email:'', gstin:'', pan:'', contract_value:'', status:'Active' };
const EMPTY_BILL = {
  invoice_no:'', invoice_date:'', description:'', taxable_value:'',
  gst_applicable:false, gst_rate:18, supply_type:'CGST+SGST',
  cgst:0, sgst:0, igst:0, gst_total:0,
  tds_applicable:false, tds_section:'194J', tds_rate:10, tds_amount:0,
  total_bill:0, net_payable:0,
};

let vendorCtr = 10, billCtr = 10;

export default function Vendors() {
  const { activeEntity, vendors, setVendors, addToast } = useAppStore();
  const entityVendors = (vendors||[]).filter(v=>v.entity_id===activeEntity?.id);

  const [tab, setTab]           = useState('vendors');
  const [vendorModal, setVendorModal] = useState(false);
  const [billModal, setBillModal]     = useState(false);
  const [payModal, setPayModal]       = useState(null);
  const [selVendor, setSelVendor]     = useState(null);
  const [vForm, setVForm]             = useState(EMPTY_VENDOR);
  const [bForm, setBForm]             = useState(EMPTY_BILL);
  const [editVId, setEditVId]         = useState(null);
  const [search, setSearch]           = useState('');
  const [payAmount, setPayAmount]     = useState('');
  const [payDate, setPayDate]         = useState(new Date().toISOString().slice(0,10));
  const [payMode, setPayMode]         = useState('NEFT');
  const [payRef, setPayRef]           = useState('');

  const setV = k => e => setVForm(f=>({...f,[k]:e.target.value}));
  const setB = k => e => {
    const val = e.target.value;
    setBForm(f => {
      const upd = { ...f, [k]:val };
      return recalcBill(upd);
    });
  };
  const setBCheck = k => e => setBForm(f => recalcBill({ ...f, [k]:e.target.checked }));

  function recalcBill(f) {
    const taxable = Number(f.taxable_value) || 0;
    let cgst=0, sgst=0, igst=0, gst_total=0;
    if (f.gst_applicable) {
      if (f.supply_type === 'IGST') { igst = Math.round(taxable * Number(f.gst_rate) / 100); }
      else { cgst = Math.round(taxable * Number(f.gst_rate) / 200); sgst = cgst; }
      gst_total = cgst + sgst + igst;
    }
    const total_bill = taxable + gst_total;
    let tds_amount = 0;
    if (f.tds_applicable) { tds_amount = Math.round(taxable * Number(f.tds_rate) / 100); }
    const net_payable = total_bill - tds_amount;
    return { ...f, cgst, sgst, igst, gst_total, total_bill, tds_amount, net_payable };
  }

  function onGSTRateChange(e) { setBForm(f => recalcBill({ ...f, gst_rate:Number(e.target.value) })); }
  function onTDSSectionChange(e) {
    const sec = TDS_SECTIONS.find(s=>s.code===e.target.value);
    setBForm(f => recalcBill({ ...f, tds_section:e.target.value, tds_rate:sec?.rate||0 }));
  }
  function onTDSRateChange(e) { setBForm(f => recalcBill({ ...f, tds_rate:Number(e.target.value) })); }

  function saveVendor() {
    if (!vForm.name.trim()) { alert('Vendor name required.'); return; }
    if (editVId) {
      setVendors(vs=>vs.map(v=>v.id===editVId?{...v,...vForm}:v));
      addToast('Vendor updated.','success');
    } else {
      vendorCtr++;
      const nv = { ...vForm, id:vendorCtr, entity_id:activeEntity?.id, bills:[] };
      setVendors(vs=>[...vs,nv]);
      addToast('Vendor added.','success');
    }
    setVendorModal(false);
  }

  function saveBill() {
    if (!bForm.invoice_no.trim()||!bForm.taxable_value) { alert('Invoice no. and taxable value required.'); return; }
    billCtr++;
    const bill = { ...bForm, id:billCtr, vendor_id:selVendor.id, paid_amount:0, status:'Unpaid' };
    setVendors(vs=>vs.map(v=>v.id===selVendor.id?{...v,bills:[...(v.bills||[]),bill]}:v));
    if (selVendor) setSelVendor(sv=>({...sv,bills:[...(sv.bills||[]),bill]}));
    addToast('Bill added.','success');
    setBillModal(false); setBForm(EMPTY_BILL);
  }

  function recordPayment() {
    if (!payAmount||Number(payAmount)<=0) { alert('Enter valid amount.'); return; }
    const paid = Number(payAmount);
    setVendors(vs=>vs.map(v=>v.id===payModal.vendor_id?{...v,bills:v.bills.map(b=>b.id===payModal.id?{...b,paid_amount:b.paid_amount+paid,status:b.paid_amount+paid>=b.net_payable?'Paid':'Part Paid'}:b)}:v));
    if (selVendor) setSelVendor(sv=>({...sv,bills:sv.bills.map(b=>b.id===payModal.id?{...b,paid_amount:b.paid_amount+paid,status:b.paid_amount+paid>=b.net_payable?'Paid':'Part Paid'}:b)}));
    addToast(`Payment ₹${paid.toLocaleString('en-IN')} recorded.`,'success');
    setPayModal(null); setPayAmount(''); setPayRef('');
  }

  const allBills = entityVendors.flatMap(v=>(v.bills||[]).map(b=>({...b,vendor_name:v.name})));
  const filtered = entityVendors.filter(v=>!search||v.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      {/* Tabs */}
      <div style={{ display:'flex', gap:3, background:'#F3F4F6', borderRadius:10, padding:3, marginBottom:14, width:'fit-content' }}>
        {[['vendors','Vendor Master'],['bills','Bill Register'],['pending','Pending Payment']].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{ padding:'6px 18px', borderRadius:7, fontSize:12.5, fontWeight:tab===id?700:500, color:tab===id?'#0D1E35':'#6B7280', background:tab===id?'#fff':'transparent', cursor:'pointer', border:tab===id?'1px solid #E5E7EB':'1px solid transparent', boxShadow:tab===id?'0 1px 2px rgba(0,0,0,0.06)':'' }}>
            {label}
          </button>
        ))}
      </div>

      {/* VENDOR MASTER */}
      {tab==='vendors' && (
        <div>
          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
            <div style={{ flex:1, position:'relative' }}>
              <Search size={12} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }}/>
              <input style={{ ...inp, paddingLeft:30 }} placeholder="Search vendors…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <button onClick={()=>{ setVForm(EMPTY_VENDOR); setEditVId(null); setVendorModal(true); }} className="btn-primary" style={{ fontSize:12.5 }}><Plus size={13}/> Add Vendor</button>
          </div>
          {filtered.map(v=>{
            const totalBilled = (v.bills||[]).reduce((s,b)=>s+b.total_bill,0);
            const totalPaid   = (v.bills||[]).reduce((s,b)=>s+b.paid_amount,0);
            return (
              <div key={v.id} style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'16px 18px', marginBottom:10, boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:800, color:'#0D1E35', marginBottom:3 }}>{v.name}</div>
                    <div style={{ fontSize:12, color:'#4B5563' }}>{v.type} · {v.phone} {v.email&&`· ${v.email}`}</div>
                    {v.gstin && <div style={{ fontSize:11.5, color:'#374151', fontFamily:'monospace', marginTop:2 }}>GSTIN: {v.gstin}</div>}
                    {v.pan  && <div style={{ fontSize:11.5, color:'#374151', fontFamily:'monospace' }}>PAN: {v.pan}</div>}
                  </div>
                  <div style={{ display:'flex', gap:7, alignItems:'center' }}>
                    <Badge value={v.status}/>
                    <button onClick={()=>{ setVForm({...v}); setEditVId(v.id); setVendorModal(true); }} style={{ background:'#F3F4F6', border:'1px solid #E5E7EB', borderRadius:7, padding:'4px 10px', cursor:'pointer', fontSize:11.5, fontWeight:600, color:'#374151', display:'flex', alignItems:'center', gap:4 }}><Edit2 size={10}/> Edit</button>
                    <button onClick={()=>{ setSelVendor(v); setBForm(EMPTY_BILL); setBillModal(true); }} className="btn-primary" style={{ fontSize:11.5 }}><Plus size={11}/> Add Bill</button>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                  {[['Contract Value',inr(v.contract_value||0,true),'#0D1E35'],['Total Billed',inr(totalBilled,true),'#78350F'],['Total Paid',inr(totalPaid,true),'#14532D'],['Balance',inr(totalBilled-totalPaid,true),totalBilled-totalPaid>0?'#7F1D1D':'#374151']].map(([l,val,c])=>(
                    <div key={l} style={{ background:'#F8FAFC', borderRadius:8, padding:'8px 11px' }}>
                      <div style={{ fontSize:9.5, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:2 }}>{l}</div>
                      <div style={{ fontSize:13, fontWeight:800, color:c, fontFamily:'monospace' }}>{val}</div>
                    </div>
                  ))}
                </div>
                {/* Bills for this vendor */}
                {(v.bills||[]).length > 0 && (
                  <div style={{ marginTop:10, overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', minWidth:800 }}>
                      <thead><tr style={{ background:'#F9FAFB', borderBottom:'1px solid #E5E7EB' }}>
                        {['Invoice','Date','Description','Taxable','GST','TDS','Total Bill','Net Payable','Paid','Balance','Status',''].map(h=>(
                          <th key={h} style={{ padding:'6px 10px', textAlign:'left', fontSize:9.5, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.4px', whiteSpace:'nowrap' }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {(v.bills||[]).map((b,i)=>(
                          <tr key={b.id} style={{ borderBottom:'1px solid #F9FAFB', background:i%2===0?'#fff':'#FAFAFA' }}>
                            <td style={{ padding:'7px 10px', fontSize:11.5, fontFamily:'monospace', fontWeight:600, color:'#0D1E35' }}>{b.invoice_no}</td>
                            <td style={{ padding:'7px 10px', fontSize:11.5, color:'#374151' }}>{fmtDate(b.invoice_date)}</td>
                            <td style={{ padding:'7px 10px', fontSize:12, color:'#374151', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.description}</td>
                            <td style={{ padding:'7px 10px', fontSize:12, fontFamily:'monospace', textAlign:'right', color:'#374151' }}>{inr(b.taxable_value)}</td>
                            <td style={{ padding:'7px 10px', fontSize:12, fontFamily:'monospace', textAlign:'right', color:b.gst_applicable?'#78350F':'#9CA3AF' }}>{b.gst_applicable?inr(b.gst_total):'—'}</td>
                            <td style={{ padding:'7px 10px', fontSize:12, fontFamily:'monospace', textAlign:'right', color:b.tds_applicable?'#1E3A8A':'#9CA3AF' }}>{b.tds_applicable?`-${inr(b.tds_amount)}`:'—'}</td>
                            <td style={{ padding:'7px 10px', fontSize:12.5, fontFamily:'monospace', textAlign:'right', fontWeight:700, color:'#0D1E35' }}>{inr(b.total_bill)}</td>
                            <td style={{ padding:'7px 10px', fontSize:12.5, fontFamily:'monospace', textAlign:'right', fontWeight:700, color:'#14532D' }}>{inr(b.net_payable)}</td>
                            <td style={{ padding:'7px 10px', fontSize:12, fontFamily:'monospace', textAlign:'right', color:'#14532D' }}>{inr(b.paid_amount)}</td>
                            <td style={{ padding:'7px 10px', fontSize:12, fontFamily:'monospace', textAlign:'right', color:b.net_payable-b.paid_amount>0?'#DC2626':'#14532D', fontWeight:700 }}>{inr(b.net_payable-b.paid_amount)}</td>
                            <td style={{ padding:'7px 10px' }}><Badge value={b.status||'Unpaid'}/></td>
                            <td style={{ padding:'7px 10px' }}>
                              {b.status!=='Paid' && (
                                <button onClick={()=>{ setPayModal({...b,vendor_id:v.id}); setPayAmount(String(b.net_payable-b.paid_amount)); setPayDate(new Date().toISOString().slice(0,10)); }}
                                  style={{ background:'#DCFCE7', border:'1px solid #86EFAC', borderRadius:6, padding:'2px 8px', cursor:'pointer', fontSize:10.5, fontWeight:700, color:'#14532D' }}>Pay</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* BILL REGISTER */}
      {tab==='bills' && (
        <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900 }}>
              <thead><tr style={{ background:'#F9FAFB', borderBottom:'2px solid #E5E7EB' }}>
                {['Vendor','Invoice No.','Date','Description','Taxable','GST Amount','TDS Amount','Total Bill','Net Payable','Status'].map(h=>(
                  <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.4px', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {allBills.length===0?<tr><td colSpan={10} style={{ textAlign:'center', padding:40, color:'#9CA3AF', fontSize:13 }}>No bills recorded yet.</td></tr>:
                allBills.map((b,i)=>(
                  <tr key={b.id} style={{ borderBottom:'1px solid #F3F4F6', background:i%2===0?'#fff':'#FAFAFA' }}>
                    <td style={{ padding:'9px 12px', fontSize:12.5, fontWeight:600, color:'#0D1E35' }}>{b.vendor_name}</td>
                    <td style={{ padding:'9px 12px', fontSize:11.5, fontFamily:'monospace', fontWeight:700, color:'#374151' }}>{b.invoice_no}</td>
                    <td style={{ padding:'9px 12px', fontSize:12.5, color:'#374151' }}>{fmtDate(b.invoice_date)}</td>
                    <td style={{ padding:'9px 12px', fontSize:12, color:'#374151' }}>{b.description}</td>
                    <td style={{ padding:'9px 12px', fontSize:12, fontFamily:'monospace', textAlign:'right', color:'#374151' }}>{inr(b.taxable_value)}</td>
                    <td style={{ padding:'9px 12px', fontSize:12, fontFamily:'monospace', textAlign:'right', color:'#78350F' }}>{b.gst_applicable?inr(b.gst_total):'—'}</td>
                    <td style={{ padding:'9px 12px', fontSize:12, fontFamily:'monospace', textAlign:'right', color:'#1E3A8A' }}>{b.tds_applicable?inr(b.tds_amount):'—'}</td>
                    <td style={{ padding:'9px 12px', fontSize:12.5, fontFamily:'monospace', textAlign:'right', fontWeight:700, color:'#0D1E35' }}>{inr(b.total_bill)}</td>
                    <td style={{ padding:'9px 12px', fontSize:12.5, fontFamily:'monospace', textAlign:'right', fontWeight:700, color:'#14532D' }}>{inr(b.net_payable)}</td>
                    <td style={{ padding:'9px 12px' }}><Badge value={b.status||'Unpaid'}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PENDING */}
      {tab==='pending' && (
        <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ background:'#F9FAFB', borderBottom:'2px solid #E5E7EB' }}>
              {['Vendor','Invoice No.','Net Payable','Paid','Balance',''].map(h=>(
                <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.4px', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {allBills.filter(b=>b.status!=='Paid').length===0
                ?<tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'#9CA3AF', fontSize:13 }}>No pending payments.</td></tr>
                :allBills.filter(b=>b.status!=='Paid').map((b,i)=>(
                  <tr key={b.id} style={{ borderBottom:'1px solid #F3F4F6', background:i%2===0?'#fff':'#FAFAFA' }}>
                    <td style={{ padding:'9px 14px', fontSize:13, fontWeight:700, color:'#0D1E35' }}>{b.vendor_name}</td>
                    <td style={{ padding:'9px 14px', fontSize:11.5, fontFamily:'monospace', color:'#374151' }}>{b.invoice_no}</td>
                    <td style={{ padding:'9px 14px', fontSize:13, fontFamily:'monospace', fontWeight:700, textAlign:'right', color:'#0D1E35' }}>{inr(b.net_payable)}</td>
                    <td style={{ padding:'9px 14px', fontSize:13, fontFamily:'monospace', textAlign:'right', color:'#14532D' }}>{inr(b.paid_amount)}</td>
                    <td style={{ padding:'9px 14px', fontSize:13, fontFamily:'monospace', textAlign:'right', fontWeight:800, color:'#DC2626' }}>{inr(b.net_payable-b.paid_amount)}</td>
                    <td style={{ padding:'9px 14px' }}>
                      <button onClick={()=>{ setPayModal({...b}); setPayAmount(String(b.net_payable-b.paid_amount)); setPayDate(new Date().toISOString().slice(0,10)); }}
                        style={{ background:'#DCFCE7', border:'1px solid #86EFAC', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:11, fontWeight:700, color:'#14532D' }}>
                        Record Payment
                      </button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* VENDOR MODAL */}
      <Modal open={vendorModal} onClose={()=>setVendorModal(false)} title={editVId?'Edit Vendor':'Add Vendor'}
        footer={<><button onClick={()=>setVendorModal(false)} className="btn-secondary" style={{ fontSize:13 }}>Cancel</button><button onClick={saveVendor} className="btn-primary" style={{ fontSize:13 }}>Save</button></>}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
          <F label="Vendor / Firm Name" required><input style={inp} value={vForm.name} onChange={setV('name')} placeholder="Full name or firm name"/></F>
          <F label="Type"><select style={sel} value={vForm.type} onChange={setV('type')}><option>Contractor</option><option>Structural Engineer</option><option>Architect</option><option>Labour Supplier</option><option>Material Supplier</option><option>Professional</option><option>Other</option></select></F>
          <F label="Phone"><input style={inp} value={vForm.phone} onChange={setV('phone')} placeholder="10-digit mobile"/></F>
          <F label="Email"><input style={inp} value={vForm.email} onChange={setV('email')} placeholder="email@domain.com"/></F>
          <F label="GSTIN"><input style={inp} value={vForm.gstin} onChange={setV('gstin')} placeholder="15-char GSTIN"/></F>
          <F label="PAN"><input style={inp} value={vForm.pan} onChange={setV('pan')} placeholder="ABCDE1234F" maxLength={10}/></F>
          <F label="Contract Value (₹)"><input style={inp} type="number" value={vForm.contract_value} onChange={setV('contract_value')} placeholder="0"/></F>
          <F label="Status"><select style={sel} value={vForm.status} onChange={setV('status')}><option>Active</option><option>Inactive</option></select></F>
        </div>
      </Modal>

      {/* ADD BILL MODAL */}
      <Modal open={billModal} onClose={()=>{ setBillModal(false); setBForm(EMPTY_BILL); }}
        title={`Add Bill — ${selVendor?.name}`} width="max-w-2xl"
        footer={<><button onClick={()=>{ setBillModal(false); setBForm(EMPTY_BILL); }} className="btn-secondary" style={{ fontSize:13 }}>Cancel</button><button onClick={saveBill} className="btn-primary" style={{ fontSize:13 }}>Save Bill</button></>}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
          <F label="Invoice No." required><input style={inp} value={bForm.invoice_no} onChange={setB('invoice_no')} placeholder="e.g. INV-2026-001"/></F>
          <F label="Invoice Date"><input style={inp} type="date" value={bForm.invoice_date} onChange={setB('invoice_date')}/></F>
          <F label="Description" span={2}><input style={inp} value={bForm.description} onChange={setB('description')} placeholder="Work / material description"/></F>
          <F label="Taxable Value (₹)" required><input style={inp} type="number" value={bForm.taxable_value} onChange={setB('taxable_value')} placeholder="0"/></F>
          <div/>

          {/* GST */}
          <div style={{ gridColumn:'1/-1' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'#F8FAFC', borderRadius:10, marginBottom:bForm.gst_applicable?12:0 }}>
              <input type="checkbox" id="gst_chk" checked={bForm.gst_applicable} onChange={setBCheck('gst_applicable')} style={{ width:15, height:15, cursor:'pointer' }}/>
              <label htmlFor="gst_chk" style={{ fontSize:13, fontWeight:700, color:'#374151', cursor:'pointer' }}>GST Applicable?</label>
            </div>
            {bForm.gst_applicable && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13, padding:'12px', background:'#EAF0F8', borderRadius:10, border:'1px solid #C5D5E8' }}>
                <F label="Vendor GSTIN" required><input style={inp} value={selVendor?.gstin||bForm.vendor_gstin||''} readOnly placeholder="From vendor master"/></F>
                <F label="Supply Type">
                  <select style={sel} value={bForm.supply_type} onChange={setB('supply_type')}>
                    <option value="CGST+SGST">CGST + SGST (Intra-state)</option>
                    <option value="IGST">IGST (Inter-state)</option>
                  </select>
                </F>
                <F label="GST Rate (%)">
                  <select style={sel} value={bForm.gst_rate} onChange={onGSTRateChange}>
                    {GST_RATES.map(r=><option key={r} value={r}>{r}%</option>)}
                  </select>
                </F>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, gridColumn:'1/-1' }}>
                  {bForm.supply_type==='CGST+SGST'?(<>
                    <div style={{ background:'#fff', borderRadius:8, padding:'8px 11px' }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', marginBottom:3 }}>CGST</div>
                      <div style={{ fontSize:13, fontWeight:800, color:'#78350F', fontFamily:'monospace' }}>{inr(bForm.cgst)}</div>
                    </div>
                    <div style={{ background:'#fff', borderRadius:8, padding:'8px 11px' }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', marginBottom:3 }}>SGST</div>
                      <div style={{ fontSize:13, fontWeight:800, color:'#78350F', fontFamily:'monospace' }}>{inr(bForm.sgst)}</div>
                    </div>
                  </>):(
                    <div style={{ background:'#fff', borderRadius:8, padding:'8px 11px' }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', marginBottom:3 }}>IGST</div>
                      <div style={{ fontSize:13, fontWeight:800, color:'#78350F', fontFamily:'monospace' }}>{inr(bForm.igst)}</div>
                    </div>
                  )}
                  <div style={{ background:'#EAF0F8', borderRadius:8, padding:'8px 11px' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'#1E3A8A', textTransform:'uppercase', marginBottom:3 }}>Total GST</div>
                    <div style={{ fontSize:13, fontWeight:800, color:'#1E3A8A', fontFamily:'monospace' }}>{inr(bForm.gst_total)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* TDS */}
          <div style={{ gridColumn:'1/-1' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'#F8FAFC', borderRadius:10, marginBottom:bForm.tds_applicable?12:0 }}>
              <input type="checkbox" id="tds_chk" checked={bForm.tds_applicable} onChange={setBCheck('tds_applicable')} style={{ width:15, height:15, cursor:'pointer' }}/>
              <label htmlFor="tds_chk" style={{ fontSize:13, fontWeight:700, color:'#374151', cursor:'pointer' }}>TDS Applicable?</label>
            </div>
            {bForm.tds_applicable && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13, padding:'12px', background:'#EDE9FE', borderRadius:10, border:'1px solid #C4B5FD' }}>
                <F label="Vendor PAN" required><input style={inp} value={selVendor?.pan||''} readOnly placeholder="From vendor master"/></F>
                <F label="TDS Section">
                  <select style={sel} value={bForm.tds_section} onChange={onTDSSectionChange}>
                    {TDS_SECTIONS.map(s=><option key={s.code} value={s.code}>{s.label}</option>)}
                  </select>
                </F>
                <F label="TDS Rate (%)">
                  <input style={inp} type="number" value={bForm.tds_rate} onChange={onTDSRateChange} placeholder="Rate"/>
                </F>
                <div style={{ background:'#EDE9FE', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#4C1D95', textTransform:'uppercase', marginBottom:3 }}>TDS Deduction</div>
                  <div style={{ fontSize:16, fontWeight:800, color:'#4C1D95', fontFamily:'monospace' }}>{inr(bForm.tds_amount)}</div>
                  <div style={{ fontSize:10.5, color:'#6B7280', marginTop:2 }}>= Taxable Value × {bForm.tds_rate}%</div>
                </div>
              </div>
            )}
          </div>

          {/* Net Payable summary */}
          <div style={{ gridColumn:'1/-1', background:'#0D1E35', borderRadius:10, padding:'12px 16px', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {[['Total Bill',inr(bForm.total_bill),'#E5E7EB'],['TDS Deducted',inr(bForm.tds_amount),'#C4B5FD'],['Net Payable',inr(bForm.net_payable),'#86EFAC']].map(([l,v,c])=>(
              <div key={l}>
                <div style={{ fontSize:9.5, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:3 }}>{l}</div>
                <div style={{ fontSize:16, fontWeight:800, color:c, fontFamily:'monospace' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* PAY MODAL */}
      <Modal open={!!payModal} onClose={()=>setPayModal(null)} title={`Record Payment — ${payModal?.invoice_no}`}
        footer={<><button onClick={()=>setPayModal(null)} className="btn-secondary" style={{ fontSize:13 }}>Cancel</button><button onClick={recordPayment} className="btn-primary" style={{ fontSize:13 }}>Record Payment</button></>}>
        {payModal && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
            <div style={{ gridColumn:'1/-1', background:'#EAF0F8', border:'1px solid #C5D5E8', borderRadius:10, padding:'10px 14px', fontSize:12.5 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                <div><span style={{ color:'#4B5563', fontWeight:600 }}>Total Bill: </span><strong style={{ fontFamily:'monospace' }}>{inr(payModal.total_bill)}</strong></div>
                <div><span style={{ color:'#4B5563', fontWeight:600 }}>TDS Deducted: </span><strong style={{ color:'#4C1D95', fontFamily:'monospace' }}>{inr(payModal.tds_amount)}</strong></div>
                <div><span style={{ color:'#4B5563', fontWeight:600 }}>Net Payable: </span><strong style={{ color:'#14532D', fontFamily:'monospace' }}>{inr(payModal.net_payable-payModal.paid_amount)}</strong></div>
              </div>
            </div>
            <F label="Amount (₹)" required><input style={inp} type="number" value={payAmount} onChange={e=>setPayAmount(e.target.value)} placeholder="0"/></F>
            <F label="Payment Date"><input style={inp} type="date" value={payDate} onChange={e=>setPayDate(e.target.value)}/></F>
            <F label="Mode"><select style={sel} value={payMode} onChange={e=>setPayMode(e.target.value)}><option>NEFT</option><option>RTGS</option><option>Cheque</option><option>UPI</option><option>Cash</option></select></F>
            <F label="UTR / Cheque Ref"><input style={inp} value={payRef} onChange={e=>setPayRef(e.target.value)} placeholder="Reference number"/></F>
          </div>
        )}
      </Modal>
    </div>
  );
}
