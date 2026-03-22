import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { inr, fmtDate } from '../../utils';
import { AlertTriangle, Clock, CheckCircle2, Search, Download, Printer, Filter, FileText, X, Plus, Trash2 } from 'lucide-react';

// ── AMOUNT IN WORDS ────────────────────────────────────────────────────────
const ONES=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const TENS=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
function numWords(n) {
  n=Math.round(Number(n)||0);
  if(!n)return'Zero';
  if(n<20)return ONES[n];
  if(n<100)return TENS[Math.floor(n/10)]+(n%10?' '+ONES[n%10]:'');
  if(n<1000)return ONES[Math.floor(n/100)]+' Hundred'+(n%100?' and '+numWords(n%100):'');
  if(n<100000)return numWords(Math.floor(n/1000))+' Thousand'+(n%1000?' '+numWords(n%1000):'');
  if(n<10000000)return numWords(Math.floor(n/100000))+' Lakh'+(n%100000?' '+numWords(n%100000):'');
  return numWords(Math.floor(n/10000000))+' Crore'+(n%10000000?' '+numWords(n%10000000):'');
}

// ── PAYMENT TYPES ──────────────────────────────────────────────────────────
const PAYMENT_TYPES = ['Token Amount','Advance','Part Payment','Final Payment','Late Payment / Penalty','GST Payment'];

// ── RECEIPT / DEMAND NUMBER GENERATORS ────────────────────────────────────
let receiptCounter = 0;
let demandCounter  = 0;
function fyString() {
  const y=new Date().getFullYear(), m=new Date().getMonth();
  const s=m>=3?y:y-1;
  return `${String(s).slice(2)}-${String(s+1).slice(2)}`;
}
function nextReceiptNo(projectCode='VH', entityCode='VEH') {
  receiptCounter++;
  return `${projectCode}/${fyString()}/REC/${String(receiptCounter).padStart(3,'0')}`;
}
function nextDemandNo(code='VEH') {
  demandCounter++;
  return `${code}/${fyString()}/DMD/${String(demandCounter).padStart(3,'0')}`;
}

// ── EMPTY PAYMENT ROW ─────────────────────────────────────────────────────
const EMPTY_PAY_ROW = () => ({ id:Date.now()+Math.random(), payment_type:'Part Payment', amount:'', mode:'NEFT', cheque_utr:'', bank:'' });

// ── STYLES ────────────────────────────────────────────────────────────────
const inp = { width:'100%', border:'1px solid #D1D5DB', borderRadius:8, padding:'7px 10px', fontSize:13, color:'#111827', background:'#fff', outline:'none', fontFamily:'Inter,system-ui,sans-serif' };
const sel = { ...inp, cursor:'pointer' };
const F = ({ label, required, children }) => (
  <div>
    <label style={{ display:'block', fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>
      {label}{required && <span style={{ color:'#DC2626', marginLeft:2 }}>*</span>}
    </label>
    {children}
  </div>
);

// ── PRINT RECEIPT ─────────────────────────────────────────────────────────
function printReceipt(booking, milestone, payRows, gstRate=5, projectName='', receiptNo='') {
  // payRows is array of {payment_type, amount, mode, cheque_utr, bank}
  const rows = Array.isArray(payRows) ? payRows : [payRows];
  const totalAmt = rows.reduce((s,r)=>s+Number(r.amount||0),0);
  const gstAmt  = Math.round(totalAmt * gstRate / (100 + gstRate));
  const baseAmt = totalAmt - gstAmt;
  const words   = numWords(totalAmt);
  const payRowsHTML = rows.map((r,i)=>`
    <tr style="background:${i%2===0?'#fff':'#F9FAFB'}">
      <td style="padding:6px 14px;font-size:12px;color:#374151">${r.payment_type||'Payment'}</td>
      <td style="padding:6px 14px;font-size:13px;font-weight:700;font-family:monospace;text-align:right;color:#0D1E35">₹${Number(r.amount||0).toLocaleString('en-IN')}</td>
      <td style="padding:6px 14px;font-size:12px;color:#374151">${r.mode||''}</td>
      <td style="padding:6px 14px;font-size:11.5px;font-family:monospace;color:#4B5563">${r.cheque_utr&&r.mode!=='Cash'?r.cheque_utr:'N/A'}</td>
      <td style="padding:6px 14px;font-size:12px;color:#374151">${r.bank||''}</td>
    </tr>`).join('');
  const html = `<!DOCTYPE html><html><head><title>Receipt ${receiptNo}</title>
<style>
  body{font-family:Arial,sans-serif;margin:0;padding:24px;color:#111;font-size:13px}
  .hdr{background:#0D1E35;color:#fff;padding:16px 22px;border-radius:8px 8px 0 0}
  .hdr h1{margin:0;font-size:20px;color:#F0C040;letter-spacing:1px}
  .hdr p{margin:3px 0 0;font-size:11px;opacity:.65}
  .hdr .title{color:#F0C040;font-size:15px;font-weight:700;margin-top:10px}
  .body{border:1px solid #E5E7EB;border-top:none;padding:18px 22px;border-radius:0 0 8px 8px}
  .rec-no{font-family:monospace;font-size:13px;background:#EAF0F8;padding:5px 12px;border-radius:5px;color:#0D1E35;font-weight:700;display:inline-block;margin-bottom:12px}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;margin-bottom:14px}
  .info-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #F3F4F6;font-size:12.5px}
  .lbl{color:#6B7280;font-weight:600} .val{font-weight:700;color:#0D1E35}
  table{width:100%;border-collapse:collapse;margin-bottom:14px}
  th{background:#0D1E35;color:#fff;padding:7px 14px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
  .total-box{background:#F0FDF4;border:1px solid #86EFAC;border-radius:10px;padding:14px 18px}
  .total-amt{font-size:20px;font-weight:800;color:#14532D;font-family:monospace}
  .words{font-style:italic;color:#4B5563;font-size:11.5px;margin-top:4px}
  .gst-row{display:flex;justify-content:space-between;margin-top:8px;font-size:12px;color:#6B7280}
  .footer{margin-top:28px;display:flex;justify-content:space-between;font-size:10px;color:#9CA3AF}
  .no-print{margin-bottom:14px} @media print{.no-print{display:none}}
</style></head><body>
<div class="no-print">
  <button onclick="window.print()" style="background:#0D1E35;color:#fff;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:700">🖨 Print / Save PDF</button>
  <button onclick="window.close()" style="background:#F3F4F6;color:#374151;border:1px solid #E5E7EB;padding:8px 18px;border-radius:6px;cursor:pointer;font-size:13px;margin-left:8px">Close</button>
</div>
<div class="hdr">
  <h1>VISION GRROUP</h1>
  <p>Vision Estate Holdings Pvt Ltd &nbsp;·&nbsp; Panvel, Raigad, Maharashtra 410206</p>
  <div class="title">PAYMENT RECEIPT</div>
</div>
<div class="body">
  <div class="rec-no">${receiptNo}</div>
  <div class="info-grid">
    <div><div class="info-row"><span class="lbl">Receipt Date</span><span class="val">${fmtDate(rows[0]?.date||new Date().toISOString().slice(0,10))}</span></div>
    <div class="info-row"><span class="lbl">Allottee</span><span class="val">${booking.allottees?.[0]?.name||booking.allottee||'—'}</span></div>
    <div class="info-row"><span class="lbl">Booking No.</span><span class="val" style="font-family:monospace">${booking.booking_no}</span></div></div>
    <div><div class="info-row"><span class="lbl">Unit No.</span><span class="val">${booking.unit_no||booking.flat||'—'}</span></div>
    <div class="info-row"><span class="lbl">Project</span><span class="val">${projectName||'Vision Harmony, Panvel'}</span></div>
    <div class="info-row"><span class="lbl">Against Milestone</span><span class="val">${milestone?.name||'—'}</span></div></div>
  </div>
  <table>
    <tr><th>Payment Description</th><th style="text-align:right">Amount (₹)</th><th>Mode</th><th>Cheque / UTR No.</th><th>Bank</th></tr>
    ${payRowsHTML}
  </table>
  <div class="total-box">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="font-size:12px;font-weight:700;color:#14532D;margin-bottom:4px">TOTAL RECEIVED (incl. GST ${gstRate}%)</div>
        <div class="total-amt">₹${totalAmt.toLocaleString('en-IN')}</div>
        <div class="words">Rupees ${words} Only</div>
      </div>
      <div style="text-align:right">
        <div class="gst-row"><span>Basic Amount (excl. GST):</span><span style="font-family:monospace;font-weight:700">₹${baseAmt.toLocaleString('en-IN')}</span></div>
        <div class="gst-row"><span>GST @ ${gstRate}%:</span><span style="font-family:monospace;font-weight:700">₹${gstAmt.toLocaleString('en-IN')}</span></div>
      </div>
    </div>
    <div style="margin-top:8px;font-size:11px;color:#4B5563">Subject to realisation of instrument.</div>
  </div>
</div>
<div class="footer">
  <span>Computer generated receipt. Generated: ${new Date().toLocaleDateString('en-IN')}</span>
  <span>For Vision Estate Holdings Pvt Ltd — Authorised Signatory</span>
</div>
</body></html>`;
  const w = window.open('', '_blank', 'width=780,height=900');
  w.document.write(html);
  w.document.close();
}
function exportCSV(booking) {
  const hdr = ['#','Milestone','%','Amt Due','GST','Total Demand','Paid','Balance','Due Date','Status','Demand No.'];
  const rows = (booking.milestones||[]).map(m => [
    m.id, `"${m.name}"`, m.pct+'%',
    m.amt, m.gst, m.total, m.paid, m.total-m.paid,
    m.due, m.status, m.demand_no||''
  ]);
  const csv = [hdr, ...rows].map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download = `Collections_${booking.unit_no||booking.flat||'unit'}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

// ── MAIN ──────────────────────────────────────────────────────────────────
export default function Payments() {
  const { activeEntity, projects, bookings: storeBookings, addToast } = useAppStore();
  const entityCode = activeEntity?.code || 'VEH';

  const [bookingsList, setBookingsList] = useState([]);
  const [selBooking, setSelBooking]     = useState(null);
  const [payModal, setPayModal]         = useState(null);
  const [historyModal, setHistoryModal] = useState(null);
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [search, setSearch]             = useState('');
  const [lastReceipt, setLastReceipt]   = useState(null);
  const [payDate, setPayDate]           = useState(new Date().toISOString().slice(0,10));
  const [payRows, setPayRows]           = useState([EMPTY_PAY_ROW()]);

  // Merge store bookings into local list
  React.useEffect(()=>{
    const eBk = (storeBookings||[]).filter(b=>b.entity_id===activeEntity?.id && b.approval_status==='Approved');
    setBookingsList(eBk);
  },[storeBookings, activeEntity?.id]);

  const entityProjects = (projects||[]).filter(p=>p.entity_id===activeEntity?.id);

  function updateBooking(upd) {
    setBookingsList(bs => bs.map(b => b.id===upd.id ? upd : b));
    setSelBooking(upd);
  }

  function openPayModal(ms) {
    setPayRows([{ ...EMPTY_PAY_ROW(), amount:String(ms.total-ms.paid), payment_type:'Part Payment' }]);
    setPayDate(new Date().toISOString().slice(0,10));
    setPayModal(ms);
    setLastReceipt(null);
  }

  function addPayRow() { setPayRows(rs=>[...rs,EMPTY_PAY_ROW()]); }
  function removePayRow(id) { setPayRows(rs=>rs.filter(r=>r.id!==id)); }
  function updatePayRow(id, field, val) { setPayRows(rs=>rs.map(r=>r.id===id?{...r,[field]:val}:r)); }

  function recordPayment() {
    const totalPaid = payRows.reduce((s,r)=>s+Number(r.amount||0),0);
    if (totalPaid<=0) { alert('Enter a valid total amount.'); return; }
    const maxPay = payModal.total - payModal.paid;
    const paid   = Math.min(totalPaid, maxPay);
    const proj   = entityProjects.find(p=>p.id===selBooking?.project_id);
    const projCode = proj?.code || entityCode;
    const recNo  = nextReceiptNo(projCode, entityCode);
    const rowsWithDate = payRows.map(r=>({...r, date:payDate}));
    const pmt = { receipt_no:recNo, date:payDate, amount:paid, mode:payRows[0]?.mode||'NEFT', cheque_utr:payRows[0]?.cheque_utr||'', bank:payRows[0]?.bank||'', payment_rows:rowsWithDate };
    const upd = {
      ...selBooking,
      milestones: (selBooking.milestones||[]).map(m => m.id===payModal.id ? {
        ...m, paid:m.paid+paid,
        status: m.paid+paid>=m.total ? 'Paid' : 'Part Paid',
        payments: [...(m.payments||[]), pmt],
      } : m)
    };
    updateBooking(upd);
    setLastReceipt({ ...pmt, milestone:payModal.name, milestoneId:payModal.id, projectName:proj?.name||'' });
    addToast(`Receipt ${recNo} — ${inr(paid)} recorded.`, 'success');
    setPayModal(null);
  }

  function issueDemand(ms) {
    const proj = entityProjects.find(p=>p.id===selBooking?.project_id);
    const dNo = nextDemandNo(proj?.code || entityCode);
    updateBooking({ ...selBooking, milestones: (selBooking.milestones||[]).map(m => m.id===ms.id ? { ...m, status:'Demand Issued', demand_no:dNo } : m) });
    addToast(`Demand notice ${dNo} issued.`, 'success');
  }

  const b = selBooking;
  const allMs    = b?.milestones || [];
  const dispMs   = filterOverdue ? allMs.filter(m=>['Overdue','Demand Issued','Part Paid'].includes(m.status)) : allMs;
  const totColl  = allMs.reduce((s,m)=>s+m.paid, 0);
  const totDemnd = allMs.filter(m=>m.status!=='Pending').reduce((s,m)=>s+m.total, 0);
  const totBal   = (b?.agreement_value||0) - totColl;
  const collPct  = b ? Math.round(totColl/Math.max(b.agreement_value,1)*100) : 0;
  const ovCount  = allMs.filter(m=>m.status==='Overdue').length;

  const allColl  = (bookingsList||[]).reduce((s,bk)=>s+(bk.milestones||[]).reduce((a,m)=>a+m.paid,0), 0);
  const allAgrmt = (bookingsList||[]).reduce((s,bk)=>s+(bk.agreement_value||0), 0);
  const allOvdue = (bookingsList||[]).reduce((s,bk)=>s+(bk.milestones||[]).filter(m=>m.status==='Overdue'||m.status==='Part Paid').reduce((a,m)=>a+(m.total-m.paid),0), 0);

  const filtBk   = (bookingsList||[]).filter(bk=>{
    const name = bk.allottees?.[0]?.name || bk.allottee || '';
    const unit = bk.unit_no || bk.flat || '';
    const bno  = bk.booking_no || '';
    return !search || name.toLowerCase().includes(search.toLowerCase()) || unit.toLowerCase().includes(search.toLowerCase()) || bno.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* OVERALL SUMMARY STRIP */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {[
          { l:'Total Agreement Value', v:inr(allAgrmt,true), bg:'#EAF0F8', bdr:'#C5D5E8', c:'#0D1E35' },
          { l:'Total Collected',       v:inr(allColl,true),  bg:'#DCFCE7', bdr:'#86EFAC', c:'#14532D' },
          { l:'Balance Remaining',     v:inr(allAgrmt-allColl,true), bg:'#FEF3C7', bdr:'#FCD34D', c:'#78350F' },
          { l:'Overdue / Unpaid',      v:inr(allOvdue,true), bg:'#FEE2E2', bdr:'#FCA5A5', c:'#7F1D1D' },
        ].map(s=>(
          <div key={s.l} style={{ background:s.bg, border:`1px solid ${s.bdr}`, borderRadius:12, padding:'12px 16px' }}>
            <div style={{ fontSize:9.5, fontWeight:700, color:s.c, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>{s.l}</div>
            <div style={{ fontSize:18, fontWeight:800, color:s.c, fontFamily:'monospace' }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* MAIN SPLIT */}
      <div style={{ display:'grid', gridTemplateColumns:'250px 1fr', gap:14, minHeight:520 }}>

        {/* LEFT: allottee list */}
        <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding:'12px 14px', borderBottom:'1px solid #F3F4F6' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>All Allottees</div>
            <div style={{ position:'relative' }}>
              <Search size={12} style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }}/>
              <input style={{ ...inp, paddingLeft:26, fontSize:12 }} placeholder="Search flat / name…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
          </div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {filtBk.map(bk => {
              const coll = (bk.milestones||[]).reduce((s,m)=>s+m.paid,0);
              const pct  = Math.round(coll/Math.max(bk.agreement_value,1)*100);
              const ov   = (bk.milestones||[]).filter(m=>m.status==='Overdue').length;
              const name = bk.allottees?.[0]?.name || bk.allottee || '—';
              const unit = bk.unit_no || bk.flat || '—';
              return (
                <div key={bk.id} onClick={()=>setSelBooking(bk)}
                  style={{ padding:'11px 14px', borderBottom:'1px solid #F9FAFB', cursor:'pointer', background:selBooking?.id===bk.id?'#EFF6FF':'transparent', borderLeft:selBooking?.id===bk.id?'3px solid #0D1E35':'3px solid transparent' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#0D1E35' }}>{unit}</div>
                  <div style={{ fontSize:12, color:'#374151', marginTop:2 }}>{name}</div>
                  <div style={{ fontSize:10.5, color:'#6B7280', fontFamily:'monospace', marginTop:1 }}>{bk.booking_no}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
                    <div style={{ flex:1, height:4, background:'#E5E7EB', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%', background:pct>=100?'#15803D':pct>=50?'#1D4ED8':'#D97706', borderRadius:2 }}/>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color:'#14532D', fontFamily:'monospace', flexShrink:0 }}>{pct}%</span>
                  </div>
                  {ov>0 && <div style={{ marginTop:4, fontSize:10.5, fontWeight:700, color:'#DC2626' }}>⚠ {ov} overdue</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: milestones */}
        {b ? (
          <div style={{ display:'flex', flexDirection:'column', gap:11, overflowY:'auto' }}>

            {/* Receipt success banner */}
            {lastReceipt && (
              <div style={{ background:'#DCFCE7', border:'1px solid #86EFAC', borderRadius:12, padding:'11px 16px', display:'flex', alignItems:'center', gap:12 }}>
                <CheckCircle2 size={17} style={{ color:'#15803D', flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#14532D' }}>
                    Payment recorded — Receipt: <span style={{ fontFamily:'monospace' }}>{lastReceipt.receipt_no}</span>
                  </div>
                  <div style={{ fontSize:11.5, color:'#166534', marginTop:1 }}>
                    {inr(lastReceipt.amount)} &nbsp;·&nbsp; {lastReceipt.mode} &nbsp;·&nbsp; {lastReceipt.milestone}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const ms = (b.milestones||[]).find(m=>(m.payments||[]).some(p=>p.receipt_no===lastReceipt.receipt_no));
                    if (ms) printReceipt(b, ms, lastReceipt.payment_rows||[lastReceipt], b.gst_rate, lastReceipt.projectName, lastReceipt.receipt_no);
                  }}
                  style={{ background:'#0D1E35', color:'#fff', border:'none', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
                  <Printer size={13}/> Print Receipt
                </button>
                <button onClick={()=>setLastReceipt(null)} style={{ background:'transparent', border:'none', cursor:'pointer', color:'#6B7280', padding:4 }}>
                  <X size={14}/>
                </button>
              </div>
            )}

            {/* Per-allottee summary */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:9 }}>
              {[
                { l:'Agreement',  v:inr(b.agreement_value), c:'#0D1E35' },
                { l:'Demanded',   v:inr(totDemnd),           c:'#78350F' },
                { l:'Collected',  v:inr(totColl),            c:'#14532D' },
                { l:'Balance',    v:inr(totBal),             c:'#78350F' },
                { l:'% Paid',     v:`${collPct}%`,           c:collPct>=100?'#14532D':collPct>=50?'#0D1E35':'#78350F' },
              ].map(s=>(
                <div key={s.l} style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, padding:'9px 12px' }}>
                  <div style={{ fontSize:9.5, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:2 }}>{s.l}</div>
                  <div style={{ fontSize:14, fontWeight:800, color:s.c, fontFamily:'monospace' }}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:11, padding:'11px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:7, alignItems:'center' }}>
                <span style={{ fontSize:12.5, fontWeight:700, color:'#0D1E35' }}>
                  {b.unit_no || b.flat || '—'} — {b.allottees?.[0]?.name || b.allottee || '—'} · {b.allottees?.[0]?.phone || b.phone || '—'}
                </span>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  {ovCount>0 && <span style={{ fontSize:11, fontWeight:700, color:'#DC2626', background:'#FEE2E2', border:'1px solid #FCA5A5', borderRadius:8, padding:'2px 8px' }}>{ovCount} overdue</span>}
                  <span style={{ fontSize:12, fontWeight:700, color:'#14532D', fontFamily:'monospace' }}>{collPct}% collected</span>
                </div>
              </div>
              <div style={{ height:7, background:'#F3F4F6', borderRadius:4, overflow:'hidden' }}>
                <div style={{ width:`${collPct}%`, height:'100%', background:collPct>=100?'#15803D':collPct>=50?'#1D4ED8':'#D97706', borderRadius:4, transition:'width .4s' }}/>
              </div>
            </div>

            {/* Toolbar */}
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <button onClick={()=>setFilterOverdue(v=>!v)}
                style={{ display:'flex', alignItems:'center', gap:6, background:filterOverdue?'#FEE2E2':'#fff', border:`1px solid ${filterOverdue?'#FCA5A5':'#E5E7EB'}`, borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12, fontWeight:600, color:filterOverdue?'#7F1D1D':'#374151' }}>
                <Filter size={12}/>{filterOverdue?'Show All':'Overdue / Pending Only'}
              </button>
              <div style={{ flex:1 }}/>
              <button onClick={()=>exportCSV(b)}
                style={{ display:'flex', alignItems:'center', gap:6, background:'#fff', border:'1px solid #E5E7EB', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12, fontWeight:600, color:'#374151' }}>
                <Download size={12}/> Export CSV
              </button>
            </div>

            {/* Milestone table */}
            <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ padding:'11px 16px', borderBottom:'1px solid #F3F4F6', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:11.5, fontWeight:700, color:'#0D1E35', textTransform:'uppercase', letterSpacing:'0.5px' }}>
                  Payment Milestones {filterOverdue&&<span style={{ color:'#DC2626', fontWeight:600 }}> — Overdue Filter ON</span>}
                </span>
                <span style={{ fontSize:11, color:'#4B5563' }}>GST {b.gst_rate}% Composite Supply</span>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:980 }}>
                  <thead>
                    <tr style={{ background:'#F9FAFB', borderBottom:'2px solid #E5E7EB' }}>
                      {['#','Milestone','%','Amt Due','GST','Total Demand','Paid','Balance','Due Date','Demand No.','Status','Actions'].map(h=>(
                        <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontSize:9.5, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.4px', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dispMs.length===0 ? (
                      <tr><td colSpan={12} style={{ textAlign:'center', padding:32, color:'#9CA3AF', fontSize:13 }}>No overdue or pending demand milestones.</td></tr>
                    ) : dispMs.map((m,i) => {
                      const bal = m.total-m.paid;
                      const bg  = m.status==='Paid'?'#F0FDF4':m.status==='Overdue'?'#FEF2F2':i%2===0?'#fff':'#FAFAFA';
                      return (
                        <tr key={m.id} style={{ borderBottom:'1px solid #F3F4F6', background:bg }}>
                          <td style={{ padding:'8px 10px', fontSize:12, color:'#6B7280' }}>{m.id}</td>
                          <td style={{ padding:'8px 10px', fontSize:12.5, fontWeight:600, color:'#0D1E35', whiteSpace:'nowrap' }}>{m.name}</td>
                          <td style={{ padding:'8px 10px', fontSize:11.5, fontFamily:'monospace', color:'#374151' }}>{m.pct}%</td>
                          <td style={{ padding:'8px 10px', fontSize:12, fontFamily:'monospace', textAlign:'right', color:'#374151' }}>{inr(m.amt)}</td>
                          <td style={{ padding:'8px 10px', fontSize:12, fontFamily:'monospace', textAlign:'right', color:'#78350F' }}>{inr(m.gst)}</td>
                          <td style={{ padding:'8px 10px', fontSize:12.5, fontWeight:700, fontFamily:'monospace', textAlign:'right', color:'#0D1E35' }}>{inr(m.total)}</td>
                          <td style={{ padding:'8px 10px', fontSize:12, fontFamily:'monospace', textAlign:'right', color:'#14532D', fontWeight:700 }}>{inr(m.paid)}</td>
                          <td style={{ padding:'8px 10px', fontSize:12, fontFamily:'monospace', textAlign:'right', color:bal>0?'#78350F':'#14532D', fontWeight:bal>0?700:400 }}>{inr(bal)}</td>
                          <td style={{ padding:'8px 10px', fontSize:11.5, color:m.status==='Overdue'?'#DC2626':'#374151', fontWeight:m.status==='Overdue'?700:400, whiteSpace:'nowrap' }}>{fmtDate(m.due)}</td>
                          <td style={{ padding:'8px 10px', fontSize:10.5, fontFamily:'monospace', color:'#4B5563', whiteSpace:'nowrap' }}>{m.demand_no||'—'}</td>
                          <td style={{ padding:'8px 10px' }}><Badge value={m.status}/></td>
                          <td style={{ padding:'8px 10px' }}>
                            <div style={{ display:'flex', gap:4, flexWrap:'nowrap' }}>
                              {m.status==='Pending' && (
                                <button onClick={()=>issueDemand(m)} style={{ background:'#FEF3C7', border:'1px solid #FCD34D', borderRadius:6, padding:'3px 7px', cursor:'pointer', fontSize:10, fontWeight:700, color:'#78350F', whiteSpace:'nowrap' }}>
                                  Issue Demand
                                </button>
                              )}
                              {['Demand Issued','Part Paid','Overdue'].includes(m.status) && (
                                <button onClick={()=>openPayModal(m)} style={{ background:'#DCFCE7', border:'1px solid #86EFAC', borderRadius:6, padding:'3px 7px', cursor:'pointer', fontSize:10, fontWeight:700, color:'#14532D', whiteSpace:'nowrap' }}>
                                  Record Payment
                                </button>
                              )}
                              {(m.payments||[]).length>0 && (
                                <button onClick={()=>setHistoryModal(m)} style={{ background:'#EDE9FE', border:'1px solid #C4B5FD', borderRadius:6, padding:'3px 7px', cursor:'pointer', fontSize:10, fontWeight:700, color:'#4C1D95', whiteSpace:'nowrap' }}>
                                  History ({m.payments.length})
                                </button>
                              )}
                              {m.status==='Paid' && (m.payments||[]).length>0 && (
                                <button onClick={()=>{const p=m.payments[m.payments.length-1]; printReceipt(b,m,p.payment_rows||[p],b.gst_rate,entityProjects.find(pr=>pr.id===b.project_id)?.name||'',p.receipt_no);}} style={{ background:'#F3F4F6', border:'1px solid #E5E7EB', borderRadius:6, padding:'3px 7px', cursor:'pointer', fontSize:10, fontWeight:600, color:'#374151', display:'flex', alignItems:'center', gap:3, whiteSpace:'nowrap' }}>
                                  <Printer size={9}/> Print
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', color:'#9CA3AF', fontSize:13 }}>
            Select an allottee to view milestones
          </div>
        )}
      </div>

      {/* RECORD PAYMENT MODAL — multi-row, payment type, auto N/A for cash */}
      <Modal open={!!payModal} onClose={()=>setPayModal(null)} title={`Record Payment — ${payModal?.name}`} width="max-w-3xl"
        footer={<>
          <button onClick={()=>setPayModal(null)} className="btn-secondary" style={{ fontSize:13 }}>Cancel</button>
          <button onClick={recordPayment} className="btn-primary" style={{ fontSize:13 }}>
            <FileText size={13}/> Record &amp; Generate Receipt
          </button>
        </>}>
        {payModal && (
          <div>
            {/* Milestone summary */}
            <div style={{ background:'#EAF0F8', border:'1px solid #C5D5E8', borderRadius:10, padding:'10px 14px', marginBottom:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, fontSize:12 }}>
                <div><span style={{ color:'#4B5563', fontWeight:600 }}>Milestone: </span><strong>{payModal.name}</strong></div>
                <div><span style={{ color:'#4B5563', fontWeight:600 }}>Total Demand: </span><strong style={{ fontFamily:'monospace' }}>{inr(payModal.total)}</strong></div>
                <div><span style={{ color:'#4B5563', fontWeight:600 }}>Balance Due: </span><strong style={{ color:'#7F1D1D', fontFamily:'monospace' }}>{inr(payModal.total-payModal.paid)}</strong></div>
              </div>
            </div>

            {/* Receipt number preview */}
            {(() => {
              const proj = entityProjects.find(p=>p.id===selBooking?.project_id);
              const projCode = proj?.code || entityCode;
              return (
                <div style={{ background:'#F0FDF4', border:'1px solid #86EFAC', borderRadius:9, padding:'8px 14px', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                  <FileText size={13} style={{ color:'#15803D' }}/>
                  <span style={{ fontSize:12, color:'#14532D' }}>Receipt no. will be: </span>
                  <span style={{ fontFamily:'monospace', fontSize:13, fontWeight:800, color:'#14532D' }}>
                    {projCode}/{fyString()}/REC/{String(receiptCounter+1).padStart(3,'0')}
                  </span>
                </div>
              );
            })()}

            {/* Receipt date */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>Receipt Date</label>
              <input style={{ ...inp, maxWidth:200 }} type="date" value={payDate} onChange={e=>setPayDate(e.target.value)}/>
            </div>

            {/* Payment rows */}
            <div style={{ background:'#F8FAFC', border:'1px solid #E5E7EB', borderRadius:12, overflow:'hidden', marginBottom:12 }}>
              <div style={{ padding:'9px 14px', background:'#0D1E35', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:11, fontWeight:700, color:'#fff', textTransform:'uppercase', letterSpacing:'0.5px' }}>Payment Rows — add up to 3 cheques / instruments</span>
                {payRows.length < 3 && (
                  <button onClick={addPayRow} style={{ background:'#F0C040', border:'none', borderRadius:6, padding:'3px 10px', cursor:'pointer', fontSize:11, fontWeight:700, color:'#0D1E35', display:'flex', alignItems:'center', gap:4 }}>
                    <Plus size={11}/> Add Row
                  </button>
                )}
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr style={{ background:'#F9FAFB', borderBottom:'2px solid #E5E7EB' }}>
                  {['Payment Type','Amount (₹)','Mode','Cheque / UTR No.','Buyer\'s Bank',''].map(h=>(
                    <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontSize:9.5, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.4px', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {payRows.map((row,ri)=>(
                    <tr key={row.id} style={{ borderBottom:'1px solid #F3F4F6', background:ri%2===0?'#fff':'#FAFAFA' }}>
                      <td style={{ padding:'6px 8px', minWidth:160 }}>
                        <select style={{ ...sel, padding:'5px 7px', fontSize:12 }} value={row.payment_type} onChange={e=>updatePayRow(row.id,'payment_type',e.target.value)}>
                          {PAYMENT_TYPES.map(t=><option key={t}>{t}</option>)}
                        </select>
                      </td>
                      <td style={{ padding:'6px 8px', width:120 }}>
                        <input style={{ ...inp, padding:'5px 7px', fontSize:13 }} type="number" value={row.amount} placeholder="0" onChange={e=>updatePayRow(row.id,'amount',e.target.value)}/>
                      </td>
                      <td style={{ padding:'6px 8px', width:110 }}>
                        <select style={{ ...sel, padding:'5px 7px', fontSize:12 }} value={row.mode} onChange={e=>{
                          updatePayRow(row.id,'mode',e.target.value);
                          if(e.target.value==='Cash') updatePayRow(row.id,'cheque_utr','N/A');
                        }}>
                          {['NEFT','RTGS','Cheque','UPI','Cash'].map(m=><option key={m}>{m}</option>)}
                        </select>
                      </td>
                      <td style={{ padding:'6px 8px', minWidth:130 }}>
                        <input style={{ ...inp, padding:'5px 7px', fontSize:12, background:row.mode==='Cash'?'#F9FAFB':'#fff' }}
                          value={row.mode==='Cash'?'N/A':row.cheque_utr} placeholder="Ref no."
                          readOnly={row.mode==='Cash'}
                          onChange={e=>updatePayRow(row.id,'cheque_utr',e.target.value)}/>
                      </td>
                      <td style={{ padding:'6px 8px', minWidth:130 }}>
                        <input style={{ ...inp, padding:'5px 7px', fontSize:12 }} value={row.bank} placeholder="Bank name" onChange={e=>updatePayRow(row.id,'bank',e.target.value)}/>
                      </td>
                      <td style={{ padding:'6px 8px' }}>
                        {payRows.length>1 && (
                          <button onClick={()=>removePayRow(row.id)} style={{ background:'#FEE2E2', border:'1px solid #FCA5A5', borderRadius:6, padding:'3px 7px', cursor:'pointer', color:'#7F1D1D' }}>
                            <Trash2 size={11}/>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Auto total + amount in words */}
            {(() => {
              const total = payRows.reduce((s,r)=>s+Number(r.amount||0),0);
              const words = numWords(total);
              return total>0 ? (
                <div style={{ background:'#F0FDF4', border:'1px solid #86EFAC', borderRadius:10, padding:'12px 16px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#14532D' }}>Total Amount</span>
                    <span style={{ fontSize:20, fontWeight:800, color:'#14532D', fontFamily:'monospace' }}>{inr(total)}</span>
                  </div>
                  <div style={{ fontSize:12, color:'#4B5563', fontStyle:'italic' }}>Rupees {words} Only</div>
                  {total > (payModal.total - payModal.paid) && (
                    <div style={{ marginTop:6, fontSize:11.5, color:'#D97706', fontWeight:600 }}>
                      ⚠ Amount exceeds balance due of {inr(payModal.total-payModal.paid)}. Only balance will be recorded.
                    </div>
                  )}
                </div>
              ) : null;
            })()}
          </div>
        )}
      </Modal>

      {/* PAYMENT HISTORY MODAL */}
      <Modal open={!!historyModal} onClose={()=>setHistoryModal(null)} title={`Payment History — ${historyModal?.name}`} width="max-w-3xl"
        footer={<button onClick={()=>setHistoryModal(null)} className="btn-secondary" style={{ fontSize:13 }}>Close</button>}>
        {historyModal && (
          <div>
            <div style={{ background:'#EAF0F8', borderRadius:10, padding:'11px 14px', marginBottom:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, fontSize:12 }}>
                {[['Total Demand',inr(historyModal.total),'#0D1E35'],['Paid',inr(historyModal.paid),'#14532D'],['Balance',inr(historyModal.total-historyModal.paid),'#78350F'],['Status',historyModal.status,'#374151']].map(([l,v,c])=>(
                  <div key={l}>
                    <div style={{ fontSize:9.5, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:2 }}>{l}</div>
                    <div style={{ fontSize:13, fontWeight:800, color:c, fontFamily:l!=='Status'?'monospace':'inherit' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ background:'#F9FAFB', borderBottom:'2px solid #E5E7EB' }}>
                {['Receipt No.','Date','Amount Paid','GST (approx)','Mode','Cheque / UTR','Bank',''].map(h=>(
                  <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.4px', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {(historyModal.payments||[]).map((p,i)=>{
                  const gAmt = Math.round(p.amount*(b?.gst_rate||5)/(100+(b?.gst_rate||5)));
                  return (
                    <tr key={i} style={{ borderBottom:'1px solid #F3F4F6', background:i%2===0?'#fff':'#FAFAFA' }}>
                      <td style={{ padding:'9px 12px', fontSize:11.5, fontFamily:'monospace', fontWeight:700, color:'#0D1E35' }}>{p.receipt_no}</td>
                      <td style={{ padding:'9px 12px', fontSize:12.5, color:'#374151' }}>{fmtDate(p.date)}</td>
                      <td style={{ padding:'9px 12px', fontSize:13, fontFamily:'monospace', textAlign:'right', fontWeight:800, color:'#14532D' }}>{inr(p.amount)}</td>
                      <td style={{ padding:'9px 12px', fontSize:12, fontFamily:'monospace', textAlign:'right', color:'#78350F' }}>{inr(gAmt)}</td>
                      <td style={{ padding:'9px 12px', fontSize:12.5, color:'#374151' }}>{p.mode}</td>
                      <td style={{ padding:'9px 12px', fontSize:11.5, fontFamily:'monospace', color:'#4B5563' }}>{p.cheque_utr||'—'}</td>
                      <td style={{ padding:'9px 12px', fontSize:12, color:'#374151' }}>{p.bank||'—'}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <button onClick={()=>printReceipt(b,historyModal,p.payment_rows||[p],b?.gst_rate||5,entityProjects.find(pr=>pr.id===b?.project_id)?.name||'',p.receipt_no)}
                          style={{ background:'#F3F4F6', border:'1px solid #E5E7EB', borderRadius:6, padding:'3px 9px', cursor:'pointer', fontSize:10.5, fontWeight:600, color:'#374151', display:'flex', alignItems:'center', gap:4 }}>
                          <Printer size={10}/> Print
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background:'#0D1E35' }}>
                  <td colSpan={2} style={{ padding:'9px 12px', fontSize:12, fontWeight:800, color:'#fff' }}>TOTAL RECEIVED</td>
                  <td style={{ padding:'9px 12px', fontSize:13, fontFamily:'monospace', textAlign:'right', fontWeight:800, color:'#86EFAC' }}>
                    {inr((historyModal.payments||[]).reduce((s,p)=>s+p.amount,0))}
                  </td>
                  <td colSpan={5}/>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
