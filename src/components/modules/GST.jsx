import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { inr, fmtDate } from '../../utils';
import { Download, FileText } from 'lucide-react';

const MONTHS = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];

function exportCSV(rows, filename) {
  if (!rows.length) return;
  const hdr = Object.keys(rows[0]);
  const csv = [hdr, ...rows.map(r=>hdr.map(k=>`"${r[k]??''}"`.replace(/\n/g,' ')))].map(r=>r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download = filename;
  a.click();
}

export default function GST() {
  const { activeEntity, bookings, vendors, brokers } = useAppStore();
  const [tab, setTab]           = useState('register');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterFY, setFilterFY] = useState('26-27');

  const entityBookings = (bookings||[]).filter(b=>b.entity_id===activeEntity?.id && b.approval_status==='Approved');
  const entityVendors  = (vendors||[]).filter(v=>v.entity_id===activeEntity?.id);
  const entityBrokers  = (brokers||[]).filter(b=>b.entity_id===activeEntity?.id);

  // ── GST REGISTER — from actual payment records (with real payment dates) ──
  const gstRegister = entityBookings.flatMap(b =>
    (b.milestones||[]).flatMap(m =>
      (m.payments||[]).filter(p=>Number(p.amount)>0).map(p=>({
        Month: (p.date||'').slice(0,7),
        'Receipt No.': p.receipt_no||'—',
        Booking: b.booking_no,
        Allottee: b.allottees?.[0]?.name||b.allottee||'',
        'Unit No.': b.unit_no||b.flat||'',
        Milestone: m.name,
        'Taxable Value': Number(p.amount) - Math.round(Number(p.amount)*(b.gst_rate||5)/(100+(b.gst_rate||5))),
        'GST Rate': (b.gst_rate||5)+'%',
        'GST Amount': Math.round(Number(p.amount)*(b.gst_rate||5)/(100+(b.gst_rate||5))),
        'Total Received': Number(p.amount),
        'Payment Mode': p.mode||'—',
      }))
    )
  ).filter(r=> !filterMonth || r.Month===filterMonth);

  const totalTaxable = gstRegister.reduce((s,r)=>s+r['Taxable Value'],0);
  const totalGST     = gstRegister.reduce((s,r)=>s+r['GST Amount'],0);
  const totalRecd    = gstRegister.reduce((s,r)=>s+r['Total Received'],0);

  // ── MONTHLY LIABILITY ────────────────────────────────────────────────
  const monthlyData = MONTHS.map(mon=>{
    const fy = filterFY;
    const mIdx = MONTHS.indexOf(mon);
    const calMon = mIdx < 9 ? `20${fy.slice(0,2)}-${String(mIdx+4).padStart(2,'0')}` : `20${fy.slice(3,5)}-${String(mIdx-8).padStart(2,'0')}`;
    const rows = gstRegister.filter(r=>r.Month===calMon);
    const gst = rows.reduce((s,r)=>s+r['GST Amount'],0);
    return { month:mon, calMon, gst, cgst:Math.round(gst/2), sgst:Math.round(gst/2), filed:false };
  });

  // ── ITC — from vendor bills with GST ────────────────────────────────
  const itcRows = entityVendors.flatMap(v=>
    (v.bills||[]).filter(b=>b.gst_applicable && b.gst_total>0).map(b=>({
      Vendor: v.name,
      GSTIN: v.gstin||'—',
      'Invoice No.': b.invoice_no,
      'Invoice Date': b.invoice_date,
      'Taxable Value': b.taxable_value,
      'CGST': b.cgst||0,
      'SGST': b.sgst||0,
      'IGST': b.igst||0,
      'Total ITC': b.gst_total,
      Status: b.status==='Paid'?'Claimable':'Pending Payment',
    }))
  );
  const totalITC = itcRows.reduce((s,r)=>s+r['Total ITC'],0);
  const claimableITC = itcRows.filter(r=>r.Status==='Claimable').reduce((s,r)=>s+r['Total ITC'],0);

  // ── TDS — from vendor bills + brokerage ─────────────────────────────
  const tdsFromVendors = entityVendors.flatMap(v=>
    (v.bills||[]).filter(b=>b.tds_applicable && b.tds_amount>0).map(b=>({
      Deductee: v.name,
      PAN: v.pan||'—',
      Section: b.tds_section,
      'Payment Date': b.invoice_date,
      'Gross Amount': b.taxable_value,
      'TDS Rate': b.tds_rate+'%',
      'TDS Amount': b.tds_amount,
      'Net Paid': b.net_payable,
      'Challan No.': '—',
      Status: 'Deducted',
    }))
  );

  const tdsFromBrokerage = entityBookings.filter(b=>b.broker_id && b.brokerage_amount>0).map(b=>{
    const broker = entityBrokers.find(br=>br.id===b.broker_id);
    const tds = Math.round(b.brokerage_amount*(broker?.tds_rate||5)/100);
    return {
      Deductee: broker?.firm_name||'Unknown Broker',
      PAN: broker?.pan||'—',
      Section: '194H',
      'Payment Date': b.booking_date,
      'Gross Amount': b.brokerage_amount,
      'TDS Rate': (broker?.tds_rate||5)+'%',
      'TDS Amount': tds,
      'Net Paid': b.brokerage_amount - tds,
      'Challan No.': '—',
      Status: 'Deducted',
    };
  });

  const allTDS = [...tdsFromVendors, ...tdsFromBrokerage];
  const totalTDS     = allTDS.reduce((s,r)=>s+r['TDS Amount'],0);
  const depositedTDS = 0;
  const pendingTDS   = totalTDS - depositedTDS;

  const sel = { border:'1px solid #D1D5DB', borderRadius:8, padding:'7px 10px', fontSize:13, color:'#111827', background:'#fff', cursor:'pointer', outline:'none' };
  const TABS = [['register','GST Register'],['monthly','Monthly Liability'],['slab','Slab Summary'],['itc','ITC Register'],['tds','TDS Register']];

  return (
    <div>
      {/* Tabs */}
      <div style={{ display:'flex', gap:3, background:'#F3F4F6', borderRadius:10, padding:3, marginBottom:16, overflowX:'auto' }}>
        {TABS.map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{ flexShrink:0, padding:'6px 16px', borderRadius:7, fontSize:12.5, fontWeight:tab===id?700:500, color:tab===id?'#0D1E35':'#6B7280', background:tab===id?'#fff':'transparent', cursor:'pointer', border:tab===id?'1px solid #E5E7EB':'1px solid transparent', boxShadow:tab===id?'0 1px 2px rgba(0,0,0,0.06)':'', whiteSpace:'nowrap' }}>
            {label}
          </button>
        ))}
      </div>

      {/* GST REGISTER */}
      {tab==='register' && (
        <div>
          <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center' }}>
            <input style={{ ...sel, width:140 }} type="month" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} placeholder="Filter month"/>
            <button onClick={()=>setFilterMonth('')} style={{ background:'#F3F4F6', border:'1px solid #E5E7EB', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12, color:'#374151' }}>Clear</button>
            <div style={{ flex:1 }}/>
            <button onClick={()=>exportCSV(gstRegister,'GST_Register.csv')} style={{ display:'flex', alignItems:'center', gap:6, background:'#fff', border:'1px solid #E5E7EB', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12, fontWeight:600, color:'#374151' }}><Download size={12}/> Export CSV</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
            {[['Taxable Value',inr(totalTaxable,true),'#0D1E35','#EAF0F8'],['Total GST Collected',inr(totalGST,true),'#78350F','#FEF3C7'],['Total Received',inr(totalRecd,true),'#14532D','#DCFCE7']].map(([l,v,c,bg])=>(
              <div key={l} style={{ background:bg, borderRadius:12, padding:'12px 16px', border:`1px solid ${c}20` }}>
                <div style={{ fontSize:9.5, fontWeight:700, color:c, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>{l}</div>
                <div style={{ fontSize:18, fontWeight:800, color:c, fontFamily:'monospace' }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, overflow:'auto', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:800 }}>
              <thead><tr style={{ background:'#F9FAFB', borderBottom:'2px solid #E5E7EB' }}>
                {['Month','Receipt No.','Booking No.','Allottee','Unit','Milestone','Mode','Taxable Value','GST Rate','GST Amount','Total Received'].map(h=>(
                  <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.4px', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {gstRegister.length===0?<tr><td colSpan={9} style={{ textAlign:'center', padding:40, color:'#9CA3AF', fontSize:13 }}>No payment entries found.</td></tr>:
                gstRegister.map((r,i)=>(
                  <tr key={i} style={{ borderBottom:'1px solid #F3F4F6', background:i%2===0?'#fff':'#FAFAFA' }}>
                    <td style={{ padding:'8px 12px', fontSize:12, color:'#374151' }}>{r.Month}</td>
                    <td style={{ padding:'8px 12px', fontSize:11, fontFamily:'monospace', fontWeight:600, color:'#1D4ED8' }}>{r['Receipt No.']}</td>
                    <td style={{ padding:'8px 12px', fontSize:11.5, fontFamily:'monospace', fontWeight:600, color:'#0D1E35' }}>{r.Booking}</td>
                    <td style={{ padding:'8px 12px', fontSize:12.5, color:'#374151' }}>{r.Allottee}</td>
                    <td style={{ padding:'8px 12px', fontSize:12.5, color:'#374151' }}>Unit {r['Unit No.']}</td>
                    <td style={{ padding:'8px 12px', fontSize:12, color:'#374151' }}>{r.Milestone}</td>
                    <td style={{ padding:'8px 12px', fontSize:12, color:'#374151' }}>{r['Payment Mode']}</td>
                    <td style={{ padding:'8px 12px', fontSize:12, fontFamily:'monospace', textAlign:'right', color:'#374151' }}>{inr(r['Taxable Value'])}</td>
                    <td style={{ padding:'8px 12px', fontSize:12, textAlign:'right', color:'#78350F', fontWeight:600 }}>{r['GST Rate']}</td>
                    <td style={{ padding:'8px 12px', fontSize:12.5, fontFamily:'monospace', textAlign:'right', fontWeight:700, color:'#78350F' }}>{inr(r['GST Amount'])}</td>
                    <td style={{ padding:'8px 12px', fontSize:13, fontFamily:'monospace', textAlign:'right', fontWeight:800, color:'#14532D' }}>{inr(r['Total Received'])}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr style={{ background:'#0D1E35' }}>
                <td colSpan={5} style={{ padding:'9px 12px', fontSize:12, fontWeight:800, color:'#fff' }}>TOTAL</td>
                <td style={{ padding:'9px 12px', fontFamily:'monospace', textAlign:'right', fontSize:13, fontWeight:800, color:'#E5E7EB' }}>{inr(totalTaxable)}</td>
                <td/>
                <td style={{ padding:'9px 12px', fontFamily:'monospace', textAlign:'right', fontSize:13, fontWeight:800, color:'#FEF3C7' }}>{inr(totalGST)}</td>
                <td style={{ padding:'9px 12px', fontFamily:'monospace', textAlign:'right', fontSize:13, fontWeight:800, color:'#86EFAC' }}>{inr(totalRecd)}</td>
              </tr></tfoot>
            </table>
          </div>
        </div>
      )}

      {/* MONTHLY LIABILITY */}
      {tab==='monthly' && (
        <div>
          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
            <select style={{ ...sel, width:120 }} value={filterFY} onChange={e=>setFilterFY(e.target.value)}><option value="26-27">FY 2026-27</option><option value="25-26">FY 2025-26</option></select>
          </div>
          <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ background:'#F9FAFB', borderBottom:'2px solid #E5E7EB' }}>
                {['Month','Total GST','CGST','SGST','GSTR-1 Due','Filing Status'].map(h=>(
                  <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.4px' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {monthlyData.map((r,i)=>(
                  <tr key={r.month} style={{ borderBottom:'1px solid #F3F4F6', background:i%2===0?'#fff':'#FAFAFA' }}>
                    <td style={{ padding:'9px 14px', fontSize:13, fontWeight:600, color:'#0D1E35' }}>{r.month}</td>
                    <td style={{ padding:'9px 14px', fontSize:13, fontFamily:'monospace', fontWeight:700, color:r.gst>0?'#78350F':'#9CA3AF' }}>{r.gst>0?inr(r.gst):'—'}</td>
                    <td style={{ padding:'9px 14px', fontSize:12, fontFamily:'monospace', color:'#374151' }}>{r.gst>0?inr(r.cgst):'—'}</td>
                    <td style={{ padding:'9px 14px', fontSize:12, fontFamily:'monospace', color:'#374151' }}>{r.gst>0?inr(r.sgst):'—'}</td>
                    <td style={{ padding:'9px 14px', fontSize:12, color:'#374151' }}>11th next month</td>
                    <td style={{ padding:'9px 14px' }}>
                      <span style={{ background:r.filed?'#DCFCE7':'#F3F4F6', color:r.filed?'#14532D':'#374151', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:10 }}>{r.filed?'Filed':'Pending'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SLAB SUMMARY */}
      {tab==='slab' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          {[['1% — Affordable Housing',entityBookings.filter(b=>b.gst_rate===1)],['5% — Standard',entityBookings.filter(b=>b.gst_rate===5)]].map(([label,bks])=>{
            const agr = bks.reduce((s,b)=>s+b.agreement_value,0);
            const collected = bks.reduce((s,b)=>s+(b.milestones||[]).reduce((a,m)=>a+m.paid,0),0);
            const gst = bks.reduce((s,b)=>s+(b.milestones||[]).reduce((a,m)=>a+Math.round(m.paid*b.gst_rate/(100+b.gst_rate)),0),0);
            return (
              <div key={label} style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'18px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#0D1E35', marginBottom:14 }}>{label}</div>
                {[['Units',bks.length],['Agreement Value',inr(agr,true)],['Collected',inr(collected,true)],['GST Collected',inr(gst,true)]].map(([l,v])=>(
                  <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #F3F4F6' }}>
                    <span style={{ fontSize:12.5, color:'#374151' }}>{l}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:'#0D1E35', fontFamily:'monospace' }}>{v}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ITC REGISTER */}
      {tab==='itc' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
            {[['Total ITC Available',inr(totalITC,true),'#14532D','#DCFCE7'],['Claimable (Bills Paid)',inr(claimableITC,true),'#1E3A8A','#DBEAFE'],['Pending (Bills Unpaid)',inr(totalITC-claimableITC,true),'#78350F','#FEF3C7']].map(([l,v,c,bg])=>(
              <div key={l} style={{ background:bg, borderRadius:12, padding:'12px 16px', border:`1px solid ${c}20` }}>
                <div style={{ fontSize:9.5, fontWeight:700, color:c, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>{l}</div>
                <div style={{ fontSize:18, fontWeight:800, color:c, fontFamily:'monospace' }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}>
            <button onClick={()=>exportCSV(itcRows,'ITC_Register.csv')} style={{ display:'flex', alignItems:'center', gap:6, background:'#fff', border:'1px solid #E5E7EB', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12, fontWeight:600, color:'#374151' }}><Download size={12}/> Export CSV</button>
          </div>
          <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, overflow:'auto', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:800 }}>
              <thead><tr style={{ background:'#F9FAFB', borderBottom:'2px solid #E5E7EB' }}>
                {['Vendor','GSTIN','Invoice No.','Date','Taxable Value','CGST','SGST','IGST','Total ITC','Status'].map(h=>(
                  <th key={h} style={{ padding:'9px 11px', textAlign:'left', fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.4px', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {itcRows.length===0?<tr><td colSpan={10} style={{ textAlign:'center', padding:40, color:'#9CA3AF', fontSize:13 }}>No vendor bills with GST found. Add bills with GST in the Vendors module.</td></tr>:
                itcRows.map((r,i)=>(
                  <tr key={i} style={{ borderBottom:'1px solid #F3F4F6', background:i%2===0?'#fff':'#FAFAFA' }}>
                    <td style={{ padding:'8px 11px', fontSize:12.5, fontWeight:600, color:'#0D1E35' }}>{r.Vendor}</td>
                    <td style={{ padding:'8px 11px', fontSize:11, fontFamily:'monospace', color:'#374151' }}>{r.GSTIN}</td>
                    <td style={{ padding:'8px 11px', fontSize:11.5, fontFamily:'monospace', color:'#374151' }}>{r['Invoice No.']}</td>
                    <td style={{ padding:'8px 11px', fontSize:12, color:'#374151' }}>{fmtDate(r['Invoice Date'])}</td>
                    <td style={{ padding:'8px 11px', fontSize:12, fontFamily:'monospace', textAlign:'right', color:'#374151' }}>{inr(r['Taxable Value'])}</td>
                    <td style={{ padding:'8px 11px', fontSize:12, fontFamily:'monospace', textAlign:'right', color:'#78350F' }}>{inr(r.CGST)}</td>
                    <td style={{ padding:'8px 11px', fontSize:12, fontFamily:'monospace', textAlign:'right', color:'#78350F' }}>{inr(r.SGST)}</td>
                    <td style={{ padding:'8px 11px', fontSize:12, fontFamily:'monospace', textAlign:'right', color:'#78350F' }}>{inr(r.IGST)}</td>
                    <td style={{ padding:'8px 11px', fontSize:13, fontFamily:'monospace', textAlign:'right', fontWeight:800, color:'#14532D' }}>{inr(r['Total ITC'])}</td>
                    <td style={{ padding:'8px 11px' }}><span style={{ background:r.Status==='Claimable'?'#DCFCE7':'#FEF3C7', color:r.Status==='Claimable'?'#14532D':'#78350F', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:10 }}>{r.Status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop:10, background:'#EAF0F8', border:'1px solid #C5D5E8', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#1E3A8A' }}>
            ITC data is auto-populated from vendor bills where GST is applicable. Bills become "Claimable" once marked as Paid in the Vendors module.
          </div>
        </div>
      )}

      {/* TDS REGISTER */}
      {tab==='tds' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
            {[['Total TDS Deducted',inr(totalTDS,true),'#4C1D95','#EDE9FE'],['Total Deposited',inr(depositedTDS,true),'#14532D','#DCFCE7'],['Pending Deposit',inr(pendingTDS,true),'#7F1D1D','#FEE2E2']].map(([l,v,c,bg])=>(
              <div key={l} style={{ background:bg, borderRadius:12, padding:'12px 16px', border:`1px solid ${c}20` }}>
                <div style={{ fontSize:9.5, fontWeight:700, color:c, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>{l}</div>
                <div style={{ fontSize:18, fontWeight:800, color:c, fontFamily:'monospace' }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}>
            <button onClick={()=>exportCSV(allTDS,'TDS_Register.csv')} style={{ display:'flex', alignItems:'center', gap:6, background:'#fff', border:'1px solid #E5E7EB', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12, fontWeight:600, color:'#374151' }}><Download size={12}/> Export CSV</button>
          </div>
          <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, overflow:'auto', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:900 }}>
              <thead><tr style={{ background:'#F9FAFB', borderBottom:'2px solid #E5E7EB' }}>
                {['Deductee','PAN','Section','Date','Gross Amount','TDS Rate','TDS Amount','Net Paid','Challan No.','Status'].map(h=>(
                  <th key={h} style={{ padding:'9px 11px', textAlign:'left', fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.4px', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {allTDS.length===0?<tr><td colSpan={10} style={{ textAlign:'center', padding:40, color:'#9CA3AF', fontSize:13 }}>No TDS entries found. Add vendor bills with TDS or approved broker bookings.</td></tr>:
                allTDS.map((r,i)=>(
                  <tr key={i} style={{ borderBottom:'1px solid #F3F4F6', background:i%2===0?'#fff':'#FAFAFA' }}>
                    <td style={{ padding:'8px 11px', fontSize:12.5, fontWeight:600, color:'#0D1E35' }}>{r.Deductee}</td>
                    <td style={{ padding:'8px 11px', fontSize:11.5, fontFamily:'monospace', color:'#374151' }}>{r.PAN}</td>
                    <td style={{ padding:'8px 11px', fontSize:11.5, fontFamily:'monospace', color:'#4C1D95', fontWeight:600 }}>{r.Section}</td>
                    <td style={{ padding:'8px 11px', fontSize:12, color:'#374151' }}>{fmtDate(r['Payment Date'])}</td>
                    <td style={{ padding:'8px 11px', fontSize:12, fontFamily:'monospace', textAlign:'right', color:'#374151' }}>{inr(r['Gross Amount'])}</td>
                    <td style={{ padding:'8px 11px', fontSize:12, textAlign:'right', color:'#374151' }}>{r['TDS Rate']}</td>
                    <td style={{ padding:'8px 11px', fontSize:13, fontFamily:'monospace', textAlign:'right', fontWeight:800, color:'#4C1D95' }}>{inr(r['TDS Amount'])}</td>
                    <td style={{ padding:'8px 11px', fontSize:12, fontFamily:'monospace', textAlign:'right', color:'#374151' }}>{inr(r['Net Paid'])}</td>
                    <td style={{ padding:'8px 11px', fontSize:11.5, fontFamily:'monospace', color:'#6B7280' }}>{r['Challan No.']}</td>
                    <td style={{ padding:'8px 11px' }}><span style={{ background:'#FEF3C7', color:'#78350F', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:10 }}>{r.Status}</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr style={{ background:'#0D1E35' }}>
                <td colSpan={6} style={{ padding:'9px 11px', fontSize:12, fontWeight:800, color:'#fff' }}>TOTAL TDS DEDUCTED</td>
                <td style={{ padding:'9px 11px', fontFamily:'monospace', textAlign:'right', fontSize:13, fontWeight:800, color:'#C4B5FD' }}>{inr(totalTDS)}</td>
                <td colSpan={3}/>
              </tr></tfoot>
            </table>
          </div>
          <div style={{ marginTop:10, background:'#EDE9FE', border:'1px solid #C4B5FD', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#4C1D95' }}>
            TDS data auto-populates from: Vendor bills (194C/194J/194I) + Brokerage payouts (194H). Deposit TDS via NEFT to Income Tax using challan ITNS 281 by 7th of next month.
          </div>
        </div>
      )}
    </div>
  );
}
