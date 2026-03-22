import React, { useState, useRef } from 'react';
import { useAppStore } from '../../stores/appStore';
import Modal from '../ui/Modal';
import { inr, fmtDate } from '../../utils';
import { Plus, Search, Paperclip, TrendingUp, TrendingDown, Download, Link } from 'lucide-react';

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

const BASE_CATEGORIES = ['Sales Receipt','Vendor Payment','Advance to Vendor','Advance from Customer','Labour','Materials','Consultancy','Legal','Brokerage','Admin','Tax & GST','Loan Repayment','Bank Charges','Other (specify)'];
const PAYMENT_MODES   = ['NEFT','RTGS','Cheque','UPI','Cash','Bank Transfer'];

const EMPTY = {
  project_id:'', date:new Date().toISOString().slice(0,10), type:'Debit',
  category:'Labour', custom_category:'', description:'', amount:'', ref:'',
  advance_party:'', advance_purpose:'', advance_status:'Pending Adjustment',
  attachment:null,
  // Vendor payment
  vendor_id:'', bill_id:'', vendor_name:'', invoice_no:'', bill_amount:'',
  // Sales receipt
  booking_id:'', unit_no:'', allottee_name:'', allottee_pan:'', allottee_phone:'', agreement_value:'', gst_rate:'',
  // Other / all entries
  party_name:'', payment_mode:'NEFT', cheque_utr:'', req_by:'', req_for:'',
};
let entryCtr = 0;

function exportCSV(entries) {
  const hdr = ['ID','Project','Date','Type','Category','Description','Amount','Ref','Party'];
  const rows = entries.map(e=>[e.id,e.project_name,e.date,e.type,e.category==='Other (specify)'?e.custom_category:e.category,`"${e.description}"`,e.amount,e.ref||'',e.party_name||'']);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([[hdr,...rows].map(r=>r.join(',')).join('\n')],{type:'text/csv'}));
  a.download = `Ledger_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

export default function Accounts() {
  const { activeEntity, projects, bookings, setBookings, vendors, setVendors, ledgerEntries, setLedgerEntries, addToast } = useAppStore();
  const entityProjects = (projects||[]).filter(p=>p.entity_id===activeEntity?.id);
  const entityBookings = (bookings||[]).filter(b=>b.entity_id===activeEntity?.id && b.approval_status==='Approved');
  const entityVendors  = (vendors||[]).filter(v=>v.entity_id===activeEntity?.id);
  const entityEntries  = (ledgerEntries||[]).filter(e=>e.entity_id===activeEntity?.id);

  const [modal,setModal]       = useState(false);
  const [form,setForm]         = useState(EMPTY);
  const [errors,setErrors]     = useState({});
  const [search,setSearch]     = useState('');
  const [filterType,setFilterType]       = useState('All');
  const [filterProject,setFilterProject] = useState('All');
  const [filterMonth,setFilterMonth]     = useState('');
  const fileRef = useRef();
  const set = k => e => { setForm(f=>({...f,[k]:e.target.value})); setErrors(er=>({...er,[k]:''})); };

  const isVendorPay     = form.category === 'Vendor Payment';
  const isSalesRcpt     = form.category === 'Sales Receipt';
  const isGSTPay        = form.category === 'Tax & GST';
  const isAdvVendor     = form.category === 'Advance to Vendor';
  const isAdvCustomer   = form.category === 'Advance from Customer';
  const isAdvance       = isAdvVendor || isAdvCustomer;
  const isOther         = !isVendorPay && !isSalesRcpt && !isAdvance;

  function onCategoryChange(e) {
    const cat = e.target.value;
    const autoType =
      cat === 'Sales Receipt'        ? 'Credit' :
      cat === 'Vendor Payment'        ? 'Debit'  :
      cat === 'Advance to Vendor'     ? 'Debit'  :
      cat === 'Advance from Customer' ? 'Credit' : 'Debit';
    setForm(f=>({ ...EMPTY, date:f.date, project_id:f.project_id, category:cat, type:autoType }));
    setErrors({});
  }

  function onVendorChange(e) {
    const vid = e.target.value;
    const v = entityVendors.find(x=>x.id===Number(vid));
    setForm(f=>({...f, vendor_id:vid, vendor_name:v?.name||'', bill_id:'', invoice_no:'', bill_amount:'', amount:'', description:'', party_name:v?.name||''}));
    setErrors(er=>({...er,vendor_id:'',bill_id:''}));
  }

  function onBillChange(e) {
    const bid = e.target.value;
    const v   = entityVendors.find(x=>x.id===Number(form.vendor_id));
    const b   = (v?.bills||[]).find(x=>x.id===Number(bid));
    if (b) {
      const bal = (b.net_payable||b.total_bill||0) - (b.paid_amount||0);
      setForm(f=>({...f, bill_id:bid, invoice_no:b.invoice_no, bill_amount:b.net_payable||b.total_bill, amount:String(Math.max(0,bal)),
        description:`Payment against invoice ${b.invoice_no} — ${v?.name} (Balance: ${inr(bal)})`}));
    }
    setErrors(er=>({...er,bill_id:''}));
  }

  function onProjectChange(e) {
    const pid = e.target.value;
    if (isSalesRcpt) {
      setForm(f=>({...f, project_id:pid, unit_no:'', booking_id:'', allottee_name:'', allottee_pan:'', allottee_phone:'', agreement_value:'', gst_rate:'', amount:'', description:''}));
    } else { set('project_id')(e); }
    setErrors(er=>({...er,project_id:'',unit_no:''}));
  }

  function onUnitChange(e) {
    const unitNo = e.target.value;
    const bk = entityBookings.find(b=>b.project_id===Number(form.project_id)&&(b.unit_no===unitNo||b.flat===unitNo));
    if (bk) {
      const al = bk.allottees?.[0]||{};
      setForm(f=>({...f, unit_no:unitNo, booking_id:bk.id,
        allottee_name:al.name||bk.allottee||'', allottee_pan:al.pan||'',
        allottee_phone:al.phone||bk.phone||'', agreement_value:bk.agreement_value,
        gst_rate:bk.gst_rate, party_name:al.name||bk.allottee||'',
        description:`Sales receipt — ${al.name||''}, Unit ${unitNo}, ${bk.booking_no||''}`, amount:'',
      }));
    } else {
      setForm(f=>({...f,unit_no:unitNo,booking_id:'',allottee_name:'',allottee_pan:'',allottee_phone:'',agreement_value:'',gst_rate:'',description:'',amount:''}));
    }
    setErrors(er=>({...er,unit_no:''}));
  }

  const selVendorBills     = form.vendor_id ? (entityVendors.find(v=>v.id===Number(form.vendor_id))?.bills||[]).filter(b=>b.status!=='Paid') : [];
  const selProjectBookings = form.project_id ? entityBookings.filter(b=>b.project_id===Number(form.project_id)) : [];

  // GST monthly liability — calculate from payments in bookings
  const gstMonthlyMap = {};
  entityBookings.forEach(b=>{
    (b.milestones||[]).forEach(m=>{
      if (m.paid>0 && m.status==='Paid') {
        const ym = m.payments?.[0]?.date?.slice(0,7) || '';
        if (!gstMonthlyMap[ym]) gstMonthlyMap[ym] = 0;
        const gst = Math.round(m.paid * (b.gst_rate||5) / (100+(b.gst_rate||5)));
        gstMonthlyMap[ym] += gst;
      }
    });
  });
  const gstMonths = Object.entries(gstMonthlyMap).sort((a,b)=>b[0].localeCompare(a[0]));

  function save() {
    const errs = {};
    if (!form.project_id) errs.project_id = 'Project is mandatory.';
    if (isVendorPay) {
      if (!form.vendor_id) errs.vendor_id = 'Select a vendor.';
      if (!form.bill_id)   errs.bill_id   = 'Select an invoice / bill.';
    }
    if (isSalesRcpt && !form.unit_no) errs.unit_no = 'Select a unit / flat number.';
    if (!form.description.trim())     errs.description = 'Description is required.';
    if (!form.amount||Number(form.amount)<=0) errs.amount = 'Enter valid amount.';
    if (form.category==='Other (specify)'&&!form.custom_category.trim()) errs.custom_category = 'Enter custom category name.';
    if (Object.keys(errs).length>0) { setErrors(errs); return; }

    const proj    = entityProjects.find(p=>p.id===Number(form.project_id));
    const totalAmt = Number(form.amount);
    // GST breakdown (for sales receipt)
    const gstRate  = Number(form.gst_rate) || 5;
    const gstAmt   = isSalesRcpt ? Math.round(totalAmt * gstRate / (100 + gstRate)) : 0;
    const taxable  = isSalesRcpt ? (totalAmt - gstAmt) : totalAmt;

    entryCtr++;
    const entry = {
      ...form, id:entryCtr, entity_id:activeEntity?.id,
      project_name:proj?.name||'', amount:totalAmt,
      // GST breakdown stored on entry
      gst_amount: gstAmt, taxable_value: taxable,
      ref: isVendorPay?form.invoice_no : isSalesRcpt?`Unit ${form.unit_no}`:form.ref,
    };
    setLedgerEntries(es=>[entry,...(es||[])]);

    // ── SALES RECEIPT SYNC — record payment on booking's next pending milestone ──
    if (isSalesRcpt && form.booking_id) {
      const receiptNo = `${proj?.code||'VG'}/${new Date().getFullYear().toString().slice(2)}-${(new Date().getFullYear()+1).toString().slice(2)}/REC/${String(entryCtr).padStart(3,'0')}`;
      setBookings(bs => bs.map(bk => {
        if (bk.id !== Number(form.booking_id)) return bk;
        const milestones = bk.milestones || [];
        let remaining = totalAmt;
        const updatedMs = milestones.map(m => {
          if (remaining <= 0 || m.status === 'Paid') return m;
          // Find first unpaid/part-paid milestone with demand issued
          if (['Demand Issued','Part Paid','Overdue','Pending'].includes(m.status)) {
            const bal    = (m.total||0) - (m.paid||0);
            const paying = Math.min(remaining, bal);
            remaining   -= paying;
            const newPaid = (m.paid||0) + paying;
            const status  = newPaid >= (m.total||0) ? 'Paid' : newPaid > 0 ? 'Part Paid' : m.status;
            const pmt     = {
              receipt_no: receiptNo, date: form.date,
              amount: paying, mode: form.payment_mode||'NEFT',
              cheque_utr: form.cheque_utr||'', bank:'',
              gst_amount: Math.round(paying * gstRate / (100+gstRate)),
              taxable_value: paying - Math.round(paying * gstRate / (100+gstRate)),
              payment_rows: [{ payment_type:'Part Payment', amount:String(paying), mode:form.payment_mode||'NEFT', cheque_utr:form.cheque_utr||'', bank:'' }],
              from_ledger: true,
            };
            return { ...m, paid: newPaid, status, payments:[...(m.payments||[]), pmt] };
          }
          return m;
        });
        return { ...bk, milestones: updatedMs };
      }));
      addToast(`Sales receipt saved — ${inr(totalAmt)} (GST: ${inr(gstAmt)}) recorded against Unit ${form.unit_no}.`, 'success');
    }
    // ── VENDOR PAYMENT SYNC — update bill paid_amount + status in Vendors store ──
    else if (isVendorPay && form.vendor_id && form.bill_id) {
      const paid = totalAmt;
      setVendors(vs => vs.map(v => {
        if (v.id !== Number(form.vendor_id)) return v;
        return {
          ...v,
          bills: (v.bills||[]).map(b => {
            if (b.id !== Number(form.bill_id)) return b;
            const newPaid = (b.paid_amount||0) + paid;
            const netPay  = b.net_payable || b.total_bill || 0;
            const status  = newPaid >= netPay ? 'Paid' : newPaid > 0 ? 'Part Paid' : 'Unpaid';
            return { ...b, paid_amount: newPaid, status };
          })
        };
      }));
      addToast(`Bill payment recorded — ${form.vendor_name}. Bill status updated.`, 'success');
    }
    else {
      addToast('Ledger entry saved.', 'success');
    }
    setModal(false); setForm(EMPTY); setErrors({});
  }

  const filtered = (entityEntries||[]).filter(e=>
    (filterType==='All'||e.type===filterType)&&
    (filterProject==='All'||e.project_name===filterProject)&&
    (!filterMonth||e.date.startsWith(filterMonth))&&
    (!search||(e.description||'').toLowerCase().includes(search.toLowerCase())||(e.project_name||'').toLowerCase().includes(search.toLowerCase())||(e.party_name||'').toLowerCase().includes(search.toLowerCase()))
  );
  const totalCredit = filtered.filter(e=>e.type==='Credit').reduce((s,e)=>s+e.amount,0);
  const totalDebit  = filtered.filter(e=>e.type==='Debit').reduce((s,e)=>s+e.amount,0);
  const balance     = totalCredit - totalDebit;
  const projNames   = [...new Set(entityEntries.map(e=>e.project_name).filter(Boolean))];

  return (
    <div>
      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
        {[['Total Credits (Income)',inr(totalCredit,true),'#DCFCE7','#86EFAC','#14532D',TrendingUp],
          ['Total Debits (Expenses)',inr(totalDebit,true),'#FEE2E2','#FCA5A5','#7F1D1D',TrendingDown],
          ['Net Balance',inr(Math.abs(balance),true)+(balance<0?' (Deficit)':''),'#EAF0F8','#C5D5E8',balance>=0?'#0D1E35':'#7F1D1D',null]
        ].map(([l,v,bg,bdr,tc,Icon])=>(
          <div key={l} style={{ background:bg, border:`1px solid ${bdr}`, borderRadius:12, padding:'13px 16px', display:'flex', alignItems:'center', gap:12 }}>
            {Icon&&<Icon size={20} style={{ color:tc }}/>}
            <div>
              <div style={{ fontSize:9.5, fontWeight:700, color:tc, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>{l}</div>
              <div style={{ fontSize:18, fontWeight:800, color:tc, fontFamily:'monospace' }}>{v}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:180, position:'relative' }}>
          <Search size={12} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }}/>
          <input style={{ ...inp, paddingLeft:30 }} placeholder="Search description, project, party…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select style={{ ...sel, width:160 }} value={filterProject} onChange={e=>setFilterProject(e.target.value)}>
          <option value="All">All Projects</option>
          {projNames.map(n=><option key={n}>{n}</option>)}
        </select>
        <select style={{ ...sel, width:120 }} value={filterType} onChange={e=>setFilterType(e.target.value)}>
          <option value="All">All Types</option><option>Credit</option><option>Debit</option>
        </select>
        <input style={{ ...sel, width:140 }} type="month" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}/>
        <button onClick={()=>exportCSV(filtered)} style={{ display:'flex', alignItems:'center', gap:6, background:'#fff', border:'1px solid #E5E7EB', borderRadius:8, padding:'7px 12px', cursor:'pointer', fontSize:12.5, fontWeight:600, color:'#374151' }}>
          <Download size={13}/> Export
        </button>
        <button onClick={()=>{ setForm(EMPTY); setErrors({}); setModal(true); }} className="btn-primary" style={{ fontSize:12.5 }}>
          <Plus size={13}/> Add Entry
        </button>
      </div>

      {/* Table */}
      <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
        {filtered.length===0
          ?<div style={{ padding:60, textAlign:'center', color:'#9CA3AF', fontSize:13 }}>No entries found.</div>
          :<table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ background:'#F9FAFB', borderBottom:'2px solid #E5E7EB' }}>
              {['Date','Project','Type','Category','Description','Party','Mode','Taxable / Amount','GST','Total','Ref/Status','Attachment'].map(h=>(
                <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.4px', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((e,i)=>{
                const cat=e.category==='Other (specify)'?(e.custom_category||'Other'):e.category;
                const isAdv = cat.startsWith('Advance');
                const rowBg = isAdv ? (i%2===0?'#FFFBEB':'#FEF9E7') : (i%2===0?'#fff':'#FAFAFA');
                return(
                  <tr key={e.id} style={{ borderBottom:'1px solid #F3F4F6', background:rowBg }}>
                    <td style={{ padding:'9px 12px', fontSize:12.5, color:'#374151', whiteSpace:'nowrap' }}>{fmtDate(e.date)}</td>
                    <td style={{ padding:'9px 12px', fontSize:12.5, fontWeight:600, color:'#0D1E35' }}>{e.project_name||'—'}</td>
                    <td style={{ padding:'9px 12px' }}>
                      <span style={{ background:e.type==='Credit'?'#DCFCE7':'#FEE2E2', color:e.type==='Credit'?'#14532D':'#7F1D1D', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:10 }}>{e.type}</span>
                    </td>
                    <td style={{ padding:'9px 12px', fontSize:12, color: isAdv?'#78350F':'#374151', fontWeight:isAdv?700:400 }}>
                      {isAdv && <span style={{ marginRight:4 }}>🔶</span>}{cat}
                    </td>
                    <td style={{ padding:'9px 12px', fontSize:12.5, color:'#111827', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.description}</td>
                    <td style={{ padding:'9px 12px', fontSize:12, color:'#374151', fontWeight:isAdv?600:400 }}>{e.party_name||e.advance_party||'—'}</td>
                    <td style={{ padding:'9px 12px', fontSize:12, color:'#374151' }}>{e.payment_mode||'—'}</td>
                    <td style={{ padding:'9px 12px', fontSize:13, fontWeight:800, fontFamily:'monospace', textAlign:'right', color:e.type==='Credit'?'#14532D':'#DC2626' }}>
                      {e.type==='Credit'?'+':'-'}{inr(e.gst_amount > 0 ? e.taxable_value : e.amount)}
                    </td>
                    <td style={{ padding:'9px 12px', fontSize:12, fontFamily:'monospace', textAlign:'right', color:'#78350F' }}>
                      {e.gst_amount > 0 ? inr(e.gst_amount) : '—'}
                    </td>
                    <td style={{ padding:'9px 12px', fontSize:13, fontWeight:800, fontFamily:'monospace', textAlign:'right', color:e.type==='Credit'?'#14532D':'#DC2626' }}>
                      {e.type==='Credit'?'+':'-'}{inr(e.amount)}
                    </td>
                    <td style={{ padding:'9px 12px', fontSize:11.5, color:'#4B5563' }}>
                      {isAdv
                        ? <span style={{ background:e.advance_status==='Fully Adjusted'||e.advance_status==='Adjusted Against Booking'?'#DCFCE7':e.advance_status==='Partially Adjusted'?'#FEF3C7':'#FEE2E2', color:e.advance_status==='Fully Adjusted'||e.advance_status==='Adjusted Against Booking'?'#14532D':e.advance_status==='Partially Adjusted'?'#78350F':'#7F1D1D', fontSize:10.5, fontWeight:700, padding:'2px 8px', borderRadius:10 }}>
                            {e.advance_status||'Pending'}
                          </span>
                        : <span style={{ fontFamily:'monospace' }}>{e.ref||'—'}</span>
                      }
                    </td>
                    <td style={{ padding:'9px 12px' }}>
                      {e.attachment
                        ?<span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11.5, color:'#1D4ED8', cursor:'pointer' }}><Paperclip size={12}/>{e.attachment.name}</span>
                        :<span style={{ fontSize:12, color:'#9CA3AF' }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background:'#0D1E35' }}>
                <td colSpan={7} style={{ padding:'9px 12px', fontSize:12, fontWeight:800, color:'#fff' }}>TOTALS (filtered)</td>
                <td style={{ padding:'9px 12px', textAlign:'right', fontSize:11, fontFamily:'monospace', fontWeight:600, color:'#E5E7EB' }}>
                  {inr(filtered.filter(e=>e.type==='Credit').reduce((s,e)=>s+(e.taxable_value||e.amount),0))}
                </td>
                <td style={{ padding:'9px 12px', textAlign:'right', fontSize:11, fontFamily:'monospace', fontWeight:600, color:'#FEF3C7' }}>
                  {inr(filtered.reduce((s,e)=>s+(e.gst_amount||0),0))}
                </td>
                <td style={{ padding:'9px 12px', textAlign:'right', fontSize:13, fontFamily:'monospace', fontWeight:800, color:balance>=0?'#86EFAC':'#FCA5A5' }}>
                  {balance>=0?'+':''}{inr(balance)}
                </td>
                <td colSpan={2}/>
              </tr>
            </tfoot>
          </table>
        }
      </div>

      {/* ADD ENTRY MODAL */}
      <Modal open={modal} onClose={()=>{ setModal(false); setErrors({}); }} title="Add Ledger Entry" width="max-w-2xl"
        footer={<><button onClick={()=>{ setModal(false); setErrors({}); }} className="btn-secondary" style={{ fontSize:13 }}>Cancel</button><button onClick={save} className="btn-primary" style={{ fontSize:13 }}>Save Entry</button></>}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>

          <F label="Category" required>
            <select style={sel} value={form.category} onChange={onCategoryChange}>
              {BASE_CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
          </F>
          <F label="Date"><input style={inp} type="date" value={form.date} onChange={set('date')}/></F>

          {/* Entry type — auto for Sales/Vendor/Advance */}
          <F label="Entry Type">
            <div style={{ display:'flex', gap:8 }}>
              {['Debit','Credit'].map(t=>{
                const isLocked = isVendorPay||isSalesRcpt||isAdvance;
                return (
                  <label key={t} style={{ flex:1, display:'flex', alignItems:'center', gap:7, cursor:'pointer', padding:'7px 12px', borderRadius:8, border:`2px solid ${form.type===t?'#0D1E35':'#E5E7EB'}`, background:form.type===t?'#EAF0F8':'#fff', justifyContent:'center', opacity:isLocked?0.6:1 }}>
                    <input type="radio" name="etype" value={t} checked={form.type===t}
                      onChange={isLocked?undefined:set('type')}
                      disabled={isLocked} style={{ width:13, height:13 }}/>
                    <span style={{ fontSize:13, fontWeight:700, color:form.type===t?'#0D1E35':'#6B7280' }}>{t}</span>
                  </label>
                );
              })}
            </div>
            {(isVendorPay||isSalesRcpt||isAdvance)&&<div style={{ fontSize:11, color:'#6B7280', marginTop:3 }}>Auto-set for this category</div>}
          </F>

          <F label="Project" required error={errors.project_id}>
            <select style={errors.project_id?{...sel,border:'1px solid #EF4444'}:sel} value={form.project_id} onChange={onProjectChange}>
              <option value="">— Select project —</option>
              {entityProjects.map(p=><option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
          </F>

          {/* ── VENDOR PAYMENT ─────────────────────────────── */}
          {isVendorPay&&(<>
            <div style={{ gridColumn:'1/-1', background:'#EDE9FE', border:'1px solid #C4B5FD', borderRadius:10, padding:'9px 13px', fontSize:12.5, color:'#4C1D95', display:'flex', alignItems:'center', gap:6 }}>
              <Link size={13}/> Linked to Vendors module — bill status auto-updates on save.
            </div>
            <F label="Vendor" required error={errors.vendor_id}>
              <select style={errors.vendor_id?{...sel,border:'1px solid #EF4444'}:sel} value={form.vendor_id} onChange={onVendorChange}>
                <option value="">— Select vendor —</option>
                {entityVendors.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </F>
            <F label="Invoice / Bill No." required error={errors.bill_id}>
              <select style={errors.bill_id?{...sel,border:'1px solid #EF4444'}:sel} value={form.bill_id} onChange={onBillChange} disabled={!form.vendor_id}>
                <option value="">— Select bill —</option>
                {selVendorBills.map(b=><option key={b.id} value={b.id}>{b.invoice_no} — Balance: {inr((b.net_payable||b.total_bill||0)-(b.paid_amount||0))}</option>)}
                {form.vendor_id&&selVendorBills.length===0&&<option disabled>No pending bills for this vendor</option>}
              </select>
            </F>
            {form.bill_id&&(
              <div style={{ gridColumn:'1/-1', background:'#F8FAFC', border:'1px solid #E5E7EB', borderRadius:10, padding:'10px 14px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, fontSize:12 }}>
                  <div><span style={{ color:'#4B5563', fontWeight:600 }}>Vendor: </span><strong>{form.vendor_name}</strong></div>
                  <div><span style={{ color:'#4B5563', fontWeight:600 }}>Invoice No.: </span><strong style={{ fontFamily:'monospace' }}>{form.invoice_no}</strong></div>
                  <div><span style={{ color:'#4B5563', fontWeight:600 }}>Net Payable: </span><strong style={{ color:'#14532D', fontFamily:'monospace' }}>{inr(form.bill_amount)}</strong></div>
                </div>
              </div>
            )}
          </>)}

          {/* ── SALES RECEIPT ──────────────────────────────── */}
          {isSalesRcpt&&(<>
            <div style={{ gridColumn:'1/-1', background:'#DCFCE7', border:'1px solid #86EFAC', borderRadius:10, padding:'9px 13px', fontSize:12.5, color:'#14532D', display:'flex', alignItems:'center', gap:6 }}>
              <Link size={13}/> Select project then unit to auto-fetch allottee details.
            </div>
            <F label="Unit / Flat No." required error={errors.unit_no}>
              <select style={errors.unit_no?{...sel,border:'1px solid #EF4444'}:sel} value={form.unit_no} onChange={onUnitChange} disabled={!form.project_id}>
                <option value="">— Select unit —</option>
                {selProjectBookings.map(b=>{
                  const unit=b.unit_no||b.flat||'';
                  const name=b.allottees?.[0]?.name||b.allottee||'';
                  return <option key={b.id} value={unit}>Unit {unit} — {name}</option>;
                })}
                {form.project_id&&selProjectBookings.length===0&&<option disabled>No approved bookings in this project</option>}
              </select>
            </F>
            <div/>
            {form.booking_id&&(
              <div style={{ gridColumn:'1/-1', background:'#F0FDF4', border:'1px solid #86EFAC', borderRadius:10, padding:'12px 14px' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#14532D', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>Auto-fetched Booking Details</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, fontSize:12 }}>
                  <div><span style={{ color:'#4B5563', fontWeight:600 }}>Allottee: </span><strong>{form.allottee_name}</strong></div>
                  <div><span style={{ color:'#4B5563', fontWeight:600 }}>PAN: </span><strong style={{ fontFamily:'monospace' }}>{form.allottee_pan||'—'}</strong></div>
                  <div><span style={{ color:'#4B5563', fontWeight:600 }}>Phone: </span><strong>{form.allottee_phone||'—'}</strong></div>
                  <div><span style={{ color:'#4B5563', fontWeight:600 }}>Agreement Value: </span><strong style={{ color:'#14532D', fontFamily:'monospace' }}>{inr(form.agreement_value)}</strong></div>
                  <div><span style={{ color:'#4B5563', fontWeight:600 }}>GST Rate: </span><strong>{form.gst_rate}%</strong></div>
                  <div><span style={{ color:'#4B5563', fontWeight:600 }}>Unit: </span><strong style={{ color:'#1D4ED8' }}>Unit {form.unit_no}</strong></div>
                </div>
              </div>
            )}
          </>)}

          {/* ── GST PAYMENT — auto-suggests monthly liability ──────────── */}
          {isGSTPay&&gstMonths.length>0&&(
            <div style={{ gridColumn:'1/-1', background:'#FEF3C7', border:'1px solid #FCD34D', borderRadius:10, padding:'10px 14px' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#78350F', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>GST Liability by Month (from payments)</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {gstMonths.slice(0,6).map(([ym,amt])=>(
                  <button key={ym} onClick={()=>setForm(f=>({...f, amount:String(amt), description:`GST payment for ${ym}`, ref:`GST-${ym}`}))}
                    style={{ background:'#fff', border:'1px solid #FCD34D', borderRadius:8, padding:'5px 12px', cursor:'pointer', fontSize:12, color:'#78350F', fontWeight:600 }}>
                    {ym}: {inr(amt)}
                  </button>
                ))}
              </div>
              <div style={{ fontSize:11, color:'#92400E', marginTop:6 }}>Click a month to auto-fill GST payment amount. Add late payment / interest manually.</div>
            </div>
          )}

          {/* ── ADVANCE TO VENDOR ───────────────────────────── */}
          {isAdvVendor&&(
            <div style={{ gridColumn:'1/-1', background:'#FEF3C7', border:'1px solid #FCD34D', borderRadius:10, padding:'12px 14px' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#78350F', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>
                🔶 Advance to Vendor — will appear as pending adjustment in Vendor module
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <F label="Vendor Name" required>
                  <select style={sel} value={form.advance_party} onChange={e=>setForm(f=>({...f, advance_party:e.target.value, party_name:e.target.value, description:`Advance to vendor — ${e.target.value}`}))}>
                    <option value="">— Select vendor —</option>
                    {entityVendors.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}
                    <option value="__manual__">Enter manually…</option>
                  </select>
                </F>
                <F label="Purpose of Advance">
                  <input style={inp} value={form.advance_purpose} onChange={e=>setForm(f=>({...f,advance_purpose:e.target.value}))} placeholder="e.g. Material advance, mobilisation"/>
                </F>
                <F label="Advance Status">
                  <select style={sel} value={form.advance_status||'Pending Adjustment'} onChange={e=>setForm(f=>({...f,advance_status:e.target.value}))}>
                    <option>Pending Adjustment</option><option>Partially Adjusted</option><option>Fully Adjusted</option>
                  </select>
                </F>
              </div>
              <div style={{ marginTop:8, fontSize:11.5, color:'#92400E' }}>
                This advance will be visible in the Vendors module under that vendor's advance register.
              </div>
            </div>
          )}

          {/* ── ADVANCE FROM CUSTOMER ─────────────────────── */}
          {isAdvCustomer&&(
            <div style={{ gridColumn:'1/-1', background:'#DCFCE7', border:'1px solid #86EFAC', borderRadius:10, padding:'12px 14px' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#14532D', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:10 }}>
                🟢 Advance from Customer — link to a booking or enter manually
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <F label="Project">
                  <select style={sel} value={form.project_id} onChange={onProjectChange}>
                    <option value="">— Select project —</option>
                    {entityProjects.map(p=><option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                  </select>
                </F>
                <F label="Customer / Allottee Name" required>
                  <select style={sel} value={form.advance_party} onChange={e=>{
                    const val = e.target.value;
                    const bk = entityBookings.find(b=>(b.allottees?.[0]?.name||b.allottee)===val);
                    setForm(f=>({...f, advance_party:val, party_name:val,
                      unit_no: bk?.unit_no||bk?.flat||f.unit_no,
                      description:`Advance from ${val}${bk?`, Unit ${bk.unit_no||bk.flat||''}`:''}`}));
                  }}>
                    <option value="">— Select customer —</option>
                    {entityBookings.map(b=>{
                      const name=b.allottees?.[0]?.name||b.allottee||'';
                      return <option key={b.id} value={name}>{name} — Unit {b.unit_no||b.flat}</option>;
                    })}
                    <option value="__new__">New / prospective customer</option>
                  </select>
                </F>
                <F label="Unit No.">
                  <input style={inp} value={form.unit_no||''} onChange={e=>setForm(f=>({...f,unit_no:e.target.value}))} placeholder="Unit / flat no."/>
                </F>
                <F label="Advance Status">
                  <select style={sel} value={form.advance_status||'Pending Adjustment'} onChange={e=>setForm(f=>({...f,advance_status:e.target.value}))}>
                    <option>Pending Adjustment</option><option>Adjusted Against Booking</option><option>Refunded</option>
                  </select>
                </F>
              </div>
              <div style={{ marginTop:8, fontSize:11.5, color:'#166534' }}>
                This advance will appear in the customer's ledger and can be adjusted when booking is confirmed.
              </div>
            </div>
          )}

          {/* Custom category */}
          {form.category==='Other (specify)'&&(
            <F label="Specify Category" required error={errors.custom_category} span={2}>
              <input style={errors.custom_category?inpE:inp} value={form.custom_category} onChange={set('custom_category')} placeholder="Enter custom category name"/>
            </F>
          )}

          <F label="Description" required error={errors.description} span={2}>
            <input style={errors.description?inpE:inp} value={form.description} onChange={set('description')} placeholder="What is this entry for?"/>
          </F>

          {/* Amount — with GST auto-breakdown for Sales Receipt */}
          {isSalesRcpt && form.gst_rate ? (() => {
            const totalAmt   = Number(form.amount) || 0;
            const gstRate    = Number(form.gst_rate) || 5;
            const gstAmt     = totalAmt ? Math.round(totalAmt * gstRate / (100 + gstRate)) : 0;
            const taxable    = totalAmt - gstAmt;
            const roundOff   = totalAmt - (taxable + gstAmt);
            return (
              <div style={{ gridColumn:'1/-1' }}>
                <div style={{ background:'#F0FDF4', border:'1px solid #86EFAC', borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#14532D', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12 }}>
                    Sales Receipt — Enter Total Amount Received (incl. GST)
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                    <F label="Total Amount Received (₹) incl. GST" required error={errors.amount}>
                      <input style={errors.amount?inpE:inp} type="number" value={form.amount}
                        onChange={set('amount')} placeholder="e.g. 525000"/>
                    </F>
                    <F label="GST Rate (Auto from Booking)">
                      <input style={{ ...inp, background:'#F9FAFB' }} value={gstRate+'%'} readOnly/>
                    </F>
                  </div>
                  {totalAmt > 0 && (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                      {[
                        ['Taxable Value (excl. GST)', inr(taxable), '#0D1E35', '#EAF0F8'],
                        ['GST @'+gstRate+'%',          inr(gstAmt),  '#78350F', '#FEF3C7'],
                        ['Total Received',              inr(totalAmt),'#14532D', '#DCFCE7'],
                      ].map(([l,v,c,bg])=>(
                        <div key={l} style={{ background:bg, borderRadius:8, padding:'10px 12px' }}>
                          <div style={{ fontSize:9.5, fontWeight:700, color:c, textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:3 }}>{l}</div>
                          <div style={{ fontSize:15, fontWeight:800, color:c, fontFamily:'monospace' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {totalAmt > 0 && (
                    <div style={{ marginTop:10, background:'#EAF0F8', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#1E3A8A' }}>
                      This GST amount ({inr(gstAmt)}) will auto-reflect in the GST Register and customer's booking ledger as "GST received against Unit {form.unit_no}".
                    </div>
                  )}
                </div>
              </div>
            );
          })() : (
            <F label="Amount (₹)" required error={errors.amount}>
              <input style={errors.amount?inpE:inp} type="number" value={form.amount} onChange={set('amount')} placeholder="0"/>
            </F>
          )}
          <F label="Reference / Voucher No.">
            <input style={inp} value={form.ref} onChange={set('ref')} placeholder="Voucher / ref no."/>
          </F>

          {/* ── EXTENDED FIELDS for all entries ─────────────────────── */}
          <F label="Party Name">
            <input style={inp} value={form.party_name} onChange={set('party_name')} placeholder="Party / payee name"/>
          </F>
          <F label="Payment Mode">
            <select style={sel} value={form.payment_mode} onChange={set('payment_mode')}>
              {PAYMENT_MODES.map(m=><option key={m}>{m}</option>)}
            </select>
          </F>
          {form.payment_mode!=='Cash'&&(
            <F label="Cheque / UTR / UPI Ref No." span={2}>
              <input style={inp} value={form.cheque_utr} onChange={set('cheque_utr')} placeholder="Reference number (auto N/A for Cash)"/>
            </F>
          )}
          <F label="Requested By">
            <input style={inp} value={form.req_by} onChange={set('req_by')} placeholder="Who requested this payment?"/>
          </F>
          <F label="Requisition / Purpose">
            <input style={inp} value={form.req_for} onChange={set('req_for')} placeholder="Purpose of requisition"/>
          </F>

          <F label="Attach Document (PDF / JPG / PNG)" span={2}>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
                onChange={e=>{ const f=e.target.files[0]; if(f)setForm(fm=>({...fm,attachment:{name:f.name,size:f.size,type:f.type}})); }}
                style={{ display:'none' }}/>
              <button onClick={()=>fileRef.current?.click()} style={{ background:'#F3F4F6', border:'1px solid #E5E7EB', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontSize:12.5, fontWeight:600, color:'#374151', display:'flex', alignItems:'center', gap:6 }}>
                <Paperclip size={12}/> Choose File
              </button>
              {form.attachment&&<span style={{ fontSize:12, color:'#1D4ED8' }}>{form.attachment.name}</span>}
            </div>
          </F>
        </div>
      </Modal>
    </div>
  );
}
