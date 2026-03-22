/**
 * Vision Grroup ERP — Excel Export Engine
 * Generates multi-sheet .xlsx files for each module.
 * Call from Electron renderer via IPC.
 */
const XLSX = require('xlsx');

function wb() { return XLSX.utils.book_new(); }
function addSheet(workbook, name, data) {
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, ws, name.slice(0,31));
}
function toBuffer(workbook) {
  return XLSX.write(workbook, { bookType:'xlsx', type:'buffer' });
}

function exportUnits(units) {
  const w = wb();
  addSheet(w, 'Unit Inventory', [
    ['Unit No.','Wing','Floor','Type','Carpet Area (sqft)','Built-up (sqft)','Base Rate','Agreement Value','GST%','Status','Allottee'],
    ...units.map(u => [u.unit_no, u.wing_name||'—', u.floor_no, u.unit_type, u.carpet_area, u.buildup_area, u.base_rate, u.agreement_value, u.gst_rate, u.status, u.allottee_name||'—'])
  ]);
  return toBuffer(w);
}

function exportBookings(bookings) {
  const w = wb();
  addSheet(w, 'Bookings', [
    ['Booking No.','Date','Flat','Project','Allottee','Phone','Agreement Value','GST%','Status','Broker','Brokerage','Funding Type','Loan Bank'],
    ...bookings.map(b => [b.booking_no, b.booking_date, b.unit_no, b.project_name, b.allottee_name, b.phone, b.agreement_value, b.gst_rate, b.status, b.broker_name||'—', b.brokerage_amount||0, b.funding_type, b.loan_bank_name||'—'])
  ]);
  return toBuffer(w);
}

function exportCollections(data) {
  const w = wb();
  addSheet(w, 'Collection Statement', [
    ['Flat','Allottee','Milestone','Amount Due','GST Due','Total Demand','Amount Received','GST Collected','Balance','Due Date','Status'],
    ...data.map(r => [r.unit_no, r.allottee_name, r.stage_name, r.amount_due, r.gst_amount, r.total_demand, r.amount_received, r.gst_collected||0, r.total_demand-r.amount_received, r.due_date, r.status])
  ]);
  return toBuffer(w);
}

function exportLedger(entries) {
  const w = wb();
  addSheet(w, 'Ledger', [
    ['Date','Type','Category','Description','Amount','Linked To'],
    ...entries.map(e => [e.entry_date, e.type, e.category, e.description, e.type==='Credit'?e.amount:-e.amount, e.linked_ref||'—'])
  ]);
  return toBuffer(w);
}

function exportGST(data, month) {
  const w = wb();
  addSheet(w, `GST ${month}`, [
    ['Flat','Allottee','Receipt No.','Date','Base Amount','GST Rate%','GST Collected','Total','Milestone'],
    ...data.map(r => [r.unit_no, r.allottee_name, r.receipt_no, r.payment_date, r.amount_received, r.gst_rate, r.gst_collected, r.total_received, r.stage_name])
  ]);
  addSheet(w, 'GSTR-1 Summary', [
    ['Month','Taxable Value','GST @ 1%','GST @ 5%','Total GST','Note'],
    [month, data.reduce((s,r)=>s+r.amount_received,0),
     data.filter(r=>r.gst_rate===1).reduce((s,r)=>s+r.gst_collected,0),
     data.filter(r=>r.gst_rate===5).reduce((s,r)=>s+r.gst_collected,0),
     data.reduce((s,r)=>s+r.gst_collected,0),
     'B2C - Composite Supply - Under Construction Residential']
  ]);
  return toBuffer(w);
}

function exportTally(entries, entityCode) {
  // Tally XML TDL import format
  const lines = ['<ENVELOPE>', '<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>', '<BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME></REQUESTDESC><REQUESTDATA>'];
  entries.forEach(e => {
    const vtype = e.type === 'Credit' ? 'Receipt' : 'Payment';
    lines.push(`<TALLYMESSAGE xmlns:UDF="TallyUDF">
<VOUCHER REMOTEID="VG-${e.id}" VCHTYPE="${vtype}" ACTION="Create">
<DATE>${e.entry_date?.replace(/-/g,'')}</DATE>
<NARRATION>${e.description||''}</NARRATION>
<VOUCHERTYPENAME>${vtype}</VOUCHERTYPENAME>
<ALLLEDGERENTRIES.LIST>
<LEDGERNAME>${e.category||'Miscellaneous'}</LEDGERNAME>
<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
<AMOUNT>${e.type==='Debit'?'-':''}${e.amount}</AMOUNT>
</ALLLEDGERENTRIES.LIST>
</VOUCHER></TALLYMESSAGE>`);
  });
  lines.push('</REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>');
  return Buffer.from(lines.join('\n'), 'utf8');
}

function exportPayroll(data, month) {
  const w = wb();
  addSheet(w, `Payroll ${month}`, [
    ['Emp Code','Name','Department','Designation','Working Days','Present Days','Half Days','Gross Salary','Deductions','Net Salary','Status'],
    ...data.map(r => [r.emp_code, r.name, r.dept_name, r.desig_name, r.working_days, r.present_days, r.half_days, r.gross_salary, r.deductions, r.net_salary, r.status])
  ]);
  return toBuffer(w);
}

function exportAuditLog(entries) {
  const w = wb();
  addSheet(w, 'Audit Log', [
    ['Timestamp','User','Entity','Module','Event','Record','Field Changed','Old Value','New Value'],
    ...entries.map(e => [e.timestamp, e.username, e.entity_code, e.module, e.event_type, e.record_ref, e.field_changed||'—', e.old_value||'—', e.new_value||'—'])
  ]);
  return toBuffer(w);
}

module.exports = { exportUnits, exportBookings, exportCollections, exportLedger, exportGST, exportTally, exportPayroll, exportAuditLog };
