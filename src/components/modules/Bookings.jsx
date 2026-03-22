import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { can, VALIDATE, suggestGSTRate, nextBookingNo, BROKERS as DEMO_BROKERS } from '../../data';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { inr, fmtDate } from '../../utils';
import { Plus, CheckCircle2, XCircle, Clock, ChevronRight, ChevronLeft, Search, AlertTriangle } from 'lucide-react';

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

const EMPTY_BOOKING = {
  // Step 1 - Allottee
  allottee_name:'', allottee_pan:'', allottee_dob:'', allottee_phone:'',
  allottee_email:'', allottee_address:'', allottee_occupation:'',
  joint_applicant:false, joint_name:'', joint_pan:'', joint_phone:'', joint_email:'',
  // Step 2 - Property
  project_id:'', unit_no:'', unit_type:'', carpet_area:'',
  agreement_value:'', base_rate:'', gst_rate:5,
  booking_date:'', agreement_date:'', possession_date:'',
  notes:'',
  // Step 3 - Home Loan
  funding_type:'Own Fund', loan_bank:'', loan_branch:'', loan_rm:'', loan_rm_phone:'',
  loan_amount_requested:'', loan_amount_sanctioned:'', loan_amount_disbursed:'',
  loan_account_no:'', loan_sanction_date:'', loan_stage:'',
  // Step 4 - Broker
  broker_involved:false, broker_id:'', brokerage_amount:'',
};

const STEPS = ['Allottee Details','Property & Pricing','Home Loan','Broker'];

// ── VIEW DETAILS MODAL — safe, no nested component helpers ─────────────────
function ViewDetailsModal({ booking, entityProjects, allBrokers, canApprove, onClose, onApprove, onReject }) {
  if (!booking) return null;
  const vb     = booking;
  const proj   = Array.isArray(entityProjects) ? entityProjects.find(p => p.id === vb.project_id) : null;
  const broker = Array.isArray(allBrokers)     ? allBrokers.find(br => br.id === vb.broker_id)    : null;
  const allottees = Array.isArray(vb.allottees) ? vb.allottees : [];
  const a0 = allottees[0] || {};

  const rowStyle = { display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #F3F4F6', fontSize:12.5 };
  const lblStyle = { color:'#6B7280', fontWeight:600 };
  const valStyle = { color:'#0D1E35', fontWeight:700 };
  const monoStyle = { ...valStyle, fontFamily:'monospace' };
  const cardStyle = { background:'#F8FAFC', border:'1px solid #E5E7EB', borderRadius:12, padding:'14px 16px' };
  const hdgStyle  = { fontSize:10, fontWeight:800, color:'#0D1E35', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:10 };

  const fmt = (v) => v || '—';
  const money = (v) => v ? '₹' + Number(v).toLocaleString('en-IN') : '—';

  return (
    <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)' }} onClick={onClose}/>
      <div style={{ position:'relative', background:'#fff', borderRadius:18, width:'100%', maxWidth:820, maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.22)' }}>

        {/* Header */}
        <div style={{ padding:'16px 22px', borderBottom:'1px solid #E5E7EB', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div style={{ fontSize:15, fontWeight:800, color:'#0D1E35' }}>
            Booking Details — <span style={{ fontFamily:'monospace' }}>{vb.booking_no || 'Draft'}</span>
          </div>
          <button onClick={onClose} style={{ background:'#F3F4F6', border:'none', borderRadius:8, width:28, height:28, cursor:'pointer', fontSize:16, color:'#6B7280', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'18px 22px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

            {/* Allottee */}
            <div style={cardStyle}>
              <div style={hdgStyle}>Allottee Details</div>
              <div style={rowStyle}><span style={lblStyle}>Name</span><span style={valStyle}>{fmt(a0.name || vb.allottee_name)}</span></div>
              <div style={rowStyle}><span style={lblStyle}>PAN</span><span style={monoStyle}>{fmt(a0.pan)}</span></div>
              <div style={rowStyle}><span style={lblStyle}>Mobile</span><span style={valStyle}>{fmt(a0.phone || vb.allottee_phone)}</span></div>
              <div style={rowStyle}><span style={lblStyle}>Email</span><span style={valStyle}>{fmt(a0.email)}</span></div>
              <div style={rowStyle}><span style={lblStyle}>Date of Birth</span><span style={valStyle}>{fmt(a0.dob)}</span></div>
              <div style={rowStyle}><span style={lblStyle}>Occupation</span><span style={valStyle}>{fmt(a0.occupation)}</span></div>
              {allottees.length > 1 && allottees.slice(1).map((a, i) => (
                <div key={i} style={{ marginTop:6, padding:'8px 10px', background:'#F3F0FF', borderRadius:8, fontSize:12 }}>
                  <strong>Joint {i+2}:</strong> {a.name || '—'} · {a.pan || '—'} · {a.phone || '—'}
                </div>
              ))}
            </div>

            {/* Property */}
            <div style={cardStyle}>
              <div style={hdgStyle}>Property Details</div>
              <div style={rowStyle}><span style={lblStyle}>Project</span><span style={valStyle}>{fmt(proj?.name)}</span></div>
              <div style={rowStyle}><span style={lblStyle}>Unit No.</span><span style={monoStyle}>{fmt(vb.unit_no || vb.flat)}</span></div>
              <div style={rowStyle}><span style={lblStyle}>Unit Type</span><span style={valStyle}>{fmt(vb.unit_type)}</span></div>
              <div style={rowStyle}><span style={lblStyle}>Carpet Area</span><span style={valStyle}>{vb.carpet_area ? vb.carpet_area + ' sqft' : '—'}</span></div>
              <div style={rowStyle}><span style={lblStyle}>Agreement Value</span><span style={valStyle}>{money(vb.agreement_value)}</span></div>
              <div style={rowStyle}><span style={lblStyle}>GST Rate</span><span style={valStyle}>{vb.gst_rate ? vb.gst_rate + '%' : '—'}</span></div>
              <div style={rowStyle}><span style={lblStyle}>Booking Date</span><span style={valStyle}>{fmt(vb.booking_date)}</span></div>
              <div style={rowStyle}><span style={lblStyle}>Agreement Date</span><span style={valStyle}>{fmt(vb.agreement_date)}</span></div>
              <div style={rowStyle}><span style={lblStyle}>Possession Date</span><span style={valStyle}>{fmt(vb.possession_date)}</span></div>
            </div>

            {/* Loan */}
            <div style={cardStyle}>
              <div style={hdgStyle}>Funding / Home Loan</div>
              <div style={rowStyle}><span style={lblStyle}>Funding Type</span><span style={valStyle}>{fmt(vb.funding_type || 'Own Fund')}</span></div>
              {vb.funding_type && vb.funding_type !== 'Own Fund' && <>
                <div style={rowStyle}><span style={lblStyle}>Loan Bank</span><span style={valStyle}>{fmt(vb.loan_bank)}</span></div>
                <div style={rowStyle}><span style={lblStyle}>Branch</span><span style={valStyle}>{fmt(vb.loan_branch)}</span></div>
                <div style={rowStyle}><span style={lblStyle}>RM Name</span><span style={valStyle}>{fmt(vb.loan_rm)}</span></div>
                <div style={rowStyle}><span style={lblStyle}>RM Phone</span><span style={valStyle}>{fmt(vb.loan_rm_phone)}</span></div>
                <div style={rowStyle}><span style={lblStyle}>Amount Requested</span><span style={valStyle}>{money(vb.loan_amount_requested)}</span></div>
                <div style={rowStyle}><span style={lblStyle}>Sanctioned</span><span style={valStyle}>{money(vb.loan_amount_sanctioned)}</span></div>
                <div style={rowStyle}><span style={lblStyle}>Disbursed</span><span style={valStyle}>{money(vb.loan_amount_disbursed)}</span></div>
                <div style={rowStyle}><span style={lblStyle}>Loan Stage</span><span style={valStyle}>{fmt(vb.loan_stage)}</span></div>
              </>}
            </div>

            {/* Status + Broker */}
            <div style={cardStyle}>
              <div style={hdgStyle}>Status &amp; Broker</div>
              <div style={rowStyle}><span style={lblStyle}>Booking Status</span><span style={valStyle}>{fmt(vb.status)}</span></div>
              <div style={rowStyle}>
                <span style={lblStyle}>Approval</span>
                <span style={{ fontWeight:700, fontSize:12.5, color: vb.approval_status==='Approved'?'#14532D': vb.approval_status==='Rejected'?'#7F1D1D':'#78350F' }}>
                  {fmt(vb.approval_status)}
                </span>
              </div>
              {vb.approved_by && <div style={rowStyle}><span style={lblStyle}>Approved By</span><span style={valStyle}>{vb.approved_by}</span></div>}
              {vb.reject_reason && (
                <div style={{ marginTop:6, background:'#FEE2E2', borderRadius:8, padding:'7px 10px', fontSize:12, color:'#7F1D1D', fontWeight:600 }}>
                  Rejection: {vb.reject_reason}
                </div>
              )}
              {broker && <>
                <div style={{ borderTop:'1px solid #E5E7EB', margin:'8px 0' }}/>
                <div style={rowStyle}><span style={lblStyle}>Broker</span><span style={valStyle}>{fmt(broker.firm_name || broker.contact_person)}</span></div>
                <div style={rowStyle}><span style={lblStyle}>Brokerage</span><span style={valStyle}>{money(vb.brokerage_amount)}</span></div>
              </>}
              {vb.notes && (
                <div style={{ marginTop:8, background:'#FEF3C7', borderRadius:8, padding:'7px 10px', fontSize:12, color:'#78350F' }}>
                  Note: {vb.notes}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 22px', borderTop:'1px solid #E5E7EB', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <button onClick={onClose} style={{ background:'#F3F4F6', border:'1px solid #E5E7EB', borderRadius:8, padding:'7px 18px', cursor:'pointer', fontSize:13, fontWeight:600, color:'#374151' }}>Close</button>
          {canApprove && vb.approval_status === 'Pending' && (
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={onApprove} style={{ background:'#DCFCE7', border:'1px solid #86EFAC', borderRadius:8, padding:'7px 18px', cursor:'pointer', fontSize:13, fontWeight:700, color:'#14532D' }}>✓ Approve</button>
              <button onClick={onReject}  style={{ background:'#FEE2E2', border:'1px solid #FCA5A5', borderRadius:8, padding:'7px 18px', cursor:'pointer', fontSize:13, fontWeight:700, color:'#7F1D1D' }}>✗ Reject</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Bookings() {
  const { user, activeEntity, projects, bookings, setBookings, brokers,
          pendingBookingUnit, setPendingBookingUnit, addToast } = useAppStore();
  const canApprove = !user || user.role === 'super_admin' || user.role === 'director' || can(user, 'canApproveBooking');
  const allBrokers = (brokers.length ? brokers : DEMO_BROKERS).filter(b=>b.status==='Active');

  const [open, setOpen]         = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [step, setStep]         = useState(0);
  const [form, setForm]         = useState(EMPTY_BOOKING);
  const [errors, setErrors]     = useState({});
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch]     = useState('');
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [unitLocked, setUnitLocked] = useState(false);
  const [thankYou, setThankYou] = useState(null); // holds { booking_no, allottee_name, unit_no, project_name }

  // Auto-open booking form when launched from Inventory "Book This Unit"
  useEffect(() => {
    if (pendingBookingUnit) {
      const preForm = {
        ...EMPTY_BOOKING,
        booking_date:    new Date().toISOString().slice(0,10),
        project_id:      String(pendingBookingUnit.project_id || ''),
        unit_no:         pendingBookingUnit.unit_no || '',
        unit_type:       pendingBookingUnit.unit_type || '',
        carpet_area:     pendingBookingUnit.carpet_area || '',
        base_rate:       pendingBookingUnit.base_rate || '',
        agreement_value: String(pendingBookingUnit.agreement_value || ''),
        gst_rate:        pendingBookingUnit.gst_rate || 5,
      };
      setForm(preForm);
      setStep(0);
      setErrors({});
      setUnitLocked(true);
      setOpen(true);
      setPendingBookingUnit(null); // clear so it doesn't re-trigger
    }
  }, [pendingBookingUnit]);

  const entityBookings = (bookings||[]).filter(b => b.entity_id === activeEntity?.id);
  const entityProjects = (projects||[]).filter(p => p.entity_id === activeEntity?.id);

  const set = k => e => { setForm(f=>({...f,[k]:e.target.value})); setErrors(er=>({...er,[k]:''})); };

  // Get available units for selected project
  const selectedProject = entityProjects.find(p => p.id === Number(form.project_id));
  const bookedUnits = entityBookings.filter(b => b.project_id === Number(form.project_id)).map(b=>b.unit_no);

  function getAvailableUnits(project) {
    if (!project) return [];
    const units = [];
    const floors = Number(project.floors || 5);
    const uPerFloor = Number(project.units_per_floor || 4);
    const types = ['2BHK','2BHK','3BHK','2BHK'];
    const areas = [750,780,1050,760];
    const rates = [5500,5500,5200,5500];
    for (let f = 1; f <= floors; f++) {
      for (let u = 1; u <= uPerFloor; u++) {
        const unitNo = `${f}0${u}`;
        if (!bookedUnits.includes(unitNo)) {
          const t = types[(u-1)%types.length];
          units.push({ unit_no:unitNo, unit_type:t, carpet_area:areas[(u-1)%areas.length], base_rate:rates[(u-1)%rates.length] });
        }
      }
    }
    return units;
  }

  function onProjectChange(e) {
    const pid = e.target.value;
    setForm(f=>({ ...f, project_id:pid, unit_no:'', unit_type:'', carpet_area:'', base_rate:'', agreement_value:'' }));
  }

  function onUnitChange(e) {
    const unitNo = e.target.value;
    const units = getAvailableUnits(selectedProject);
    const unit = units.find(u=>u.unit_no===unitNo);
    if (unit) {
      const agr = unit.carpet_area * unit.base_rate;
      const gst = suggestGSTRate(unit.unit_type, agr);
      setForm(f=>({ ...f, unit_no:unitNo, unit_type:unit.unit_type, carpet_area:unit.carpet_area, base_rate:unit.base_rate, agreement_value:String(agr), gst_rate:gst }));
    }
  }

  function onAgreementValueChange(e) {
    const val = e.target.value;
    const rate = form.carpet_area ? Math.round(Number(val) / Number(form.carpet_area)) : '';
    const gst = suggestGSTRate(form.unit_type, Number(val));
    setForm(f=>({ ...f, agreement_value:val, base_rate:String(rate), gst_rate:gst }));
  }

  function validateStep(s) {
    const e = {};
    if (s === 0) {
      if (!form.allottee_name.trim()) e.allottee_name = 'Name is required.';
      if (!VALIDATE.pan(form.allottee_pan)) e.allottee_pan = VALIDATE.panMsg;
      if (!VALIDATE.phone(form.allottee_phone)) e.allottee_phone = VALIDATE.phoneMsg;
      if (form.allottee_email && !VALIDATE.email(form.allottee_email)) e.allottee_email = VALIDATE.emailMsg;
      if (form.joint_applicant) {
        if (!form.joint_name.trim()) e.joint_name = 'Joint applicant name required.';
        if (form.joint_pan && !VALIDATE.pan(form.joint_pan)) e.joint_pan = VALIDATE.panMsg;
      }
    }
    if (s === 1) {
      if (!form.project_id) e.project_id = 'Select a project.';
      if (!form.unit_no)    e.unit_no    = 'Select a unit.';
      if (!form.agreement_value || Number(form.agreement_value) <= 0) e.agreement_value = 'Enter agreement value.';
      if (!form.booking_date) e.booking_date = 'Booking date required.';
    }
    return e;
  }

  function nextStep() {
    const errs = validateStep(step);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStep(s => Math.min(s+1, 3));
  }

  function prevStep() { setStep(s => Math.max(s-1, 0)); setErrors({}); }

  function submitBooking() {
    try {
      const bkgNo = nextBookingNo(activeEntity?.code || 'VEH');
      const agr   = Number(form.agreement_value) || 0;
      const gstR  = Number(form.gst_rate) || 5;

      const ms = (selectedProject?.milestone_schedule || []).map((m, i) => {
        const amt = Math.round(agr * Number(m.pct || 0) / 100);
        const gst = Math.round(amt * gstR / 100);
        return {
          id: i + 1, name: m.name || '', pct: m.pct || 0,
          amt, gst, total: amt + gst, paid: 0,
          due: '', status: 'Pending', demand_no: '', payments: [],
        };
      });

      const newBooking = {
        id: Date.now(),
        entity_id:        activeEntity?.id,
        project_id:       Number(form.project_id) || 0,
        unit_no:          form.unit_no || '',
        booking_no:       bkgNo,
        booking_date:     form.booking_date || '',
        agreement_date:   form.agreement_date || '',
        possession_date:  form.possession_date || '',
        agreement_value:  agr,
        gst_rate:         gstR,
        status:           'Pending Approval',
        approval_status:  'Pending',
        reject_reason:    '',
        broker_id:        form.broker_involved ? (Number(form.broker_id) || null) : null,
        brokerage_amount: form.broker_involved ? (Number(form.brokerage_amount) || 0) : 0,
        funding_type:     form.funding_type || 'Own Fund',
        loan_bank:        form.loan_bank || '',
        loan_branch:      form.loan_branch || '',
        loan_rm:          form.loan_rm || '',
        loan_rm_phone:    form.loan_rm_phone || '',
        loan_amount_requested:  Number(form.loan_amount_requested) || 0,
        loan_amount_sanctioned: Number(form.loan_amount_sanctioned) || 0,
        loan_amount_disbursed:  Number(form.loan_amount_disbursed) || 0,
        loan_stage:       form.loan_stage || '',
        allottees: [
          {
            id: 1, applicant_order: 1,
            name:       form.allottee_name || '',
            pan:        (form.allottee_pan || '').toUpperCase(),
            aadhaar:    '',
            phone:      form.allottee_phone || '',
            email:      form.allottee_email || '',
            address:    form.allottee_address || '',
            occupation: form.allottee_occupation || '',
            dob:        form.allottee_dob || '',
          },
          ...(form.joint_applicant && form.joint_name ? [{
            id: 2, applicant_order: 2,
            name:  form.joint_name  || '',
            pan:   (form.joint_pan  || '').toUpperCase(),
            phone: form.joint_phone || '',
            email: form.joint_email || '',
          }] : []),
        ],
        milestones: ms,
      };

      // Reset UI state first, then update data
      setOpen(false);
      setStep(0);
      setErrors({});
      setUnitLocked(false);
      setForm({ ...EMPTY_BOOKING });
      setBookings(bs => [...bs, newBooking]);
      setThankYou({
        booking_no:    bkgNo,
        allottee_name: form.allottee_name,
        unit_no:       form.unit_no,
        project_name:  entityProjects.find(p=>p.id===Number(form.project_id))?.name || '',
      });
      addToast(`Booking ${bkgNo} submitted successfully.`, 'success');

    } catch (err) {
      console.error('submitBooking error:', err);
      addToast('Error submitting booking. Please try again.', 'error');
    }
  }

  function approveBooking(b) {
    setBookings(bs => bs.map(bk => bk.id===b.id ? { ...bk, status:'Booked', approval_status:'Approved', approved_by:user?.full_name, approved_date:new Date().toISOString().slice(0,10) } : bk));
    addToast(`Booking ${b.booking_no} approved.`, 'success');
  }

  function rejectBooking() {
    if (!rejectReason.trim()) { alert('Enter rejection reason.'); return; }
    setBookings(bs => bs.map(bk => bk.id===rejectModal.id ? { ...bk, status:'Rejected', approval_status:'Rejected', reject_reason:rejectReason } : bk));
    addToast(`Booking ${rejectModal.booking_no} rejected.`, 'error');
    setRejectModal(null); setRejectReason('');
  }

  const pendingCount = entityBookings.filter(b=>b.approval_status==='Pending').length;
  const filtered = entityBookings.filter(b =>
    (filterStatus==='All' || b.status===filterStatus) &&
    (!search || b.allottees?.[0]?.name?.toLowerCase().includes(search.toLowerCase()) ||
     b.booking_no?.toLowerCase().includes(search.toLowerCase()) || b.unit_no?.includes(search))
  );

  return (
    <div>
      {/* Pending approvals banner */}
      {canApprove && pendingCount > 0 && (
        <div style={{ background:'#FEF3C7', border:'1px solid #FCD34D', borderRadius:12, padding:'11px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
          <AlertTriangle size={16} style={{ color:'#D97706' }}/>
          <span style={{ fontSize:13, fontWeight:600, color:'#78350F' }}>{pendingCount} booking{pendingCount>1?'s':''} pending your approval</span>
          <button onClick={()=>setFilterStatus('Pending Approval')} style={{ marginLeft:'auto', background:'#0D1E35', color:'#fff', border:'none', borderRadius:8, padding:'5px 14px', cursor:'pointer', fontSize:12, fontWeight:700 }}>Review →</button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }}/>
          <input style={{ ...inp, paddingLeft:32 }} placeholder="Search name, flat, booking no…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select style={{ ...sel, width:180 }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          {['All','Pending Approval','Booked','Agreement Done','Registered','Rejected'].map(s=><option key={s}>{s}</option>)}
        </select>
        <div style={{ display:'flex', alignItems:'center', gap:6, background:'#EAF0F8', border:'1px solid #C5D5E8', borderRadius:8, padding:'6px 12px', fontSize:12, color:'#1E3A8A' }}>
          🏢 To create a booking, go to <strong style={{ marginLeft:4, cursor:'pointer', textDecoration:'underline' }} onClick={()=>useAppStore.getState().setActiveModule('inventory')}>Projects &amp; Inventory</strong> → select an available unit → "Book This Unit"
        </div>
      </div>

      {/* Bookings table */}
      <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
        {filtered.length===0 ? (
          <div style={{ padding:60, textAlign:'center', color:'#9CA3AF', fontSize:13 }}>No bookings found.</div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ background:'#F9FAFB', borderBottom:'2px solid #E5E7EB' }}>
              {['Booking No.','Allottee','Project / Unit','Agreement Value','Booking Date','Status','Approval','Actions'].map(h=>(
                <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.4px', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((b,i)=>{
                const proj = entityProjects.find(p=>p.id===b.project_id);
                return (
                  <tr key={b.id} style={{ borderBottom:'1px solid #F3F4F6', background:i%2===0?'#fff':'#FAFAFA' }}>
                    <td style={{ padding:'9px 14px', fontSize:11.5, fontFamily:'monospace', fontWeight:700, color:'#0D1E35' }}>{b.booking_no}</td>
                    <td style={{ padding:'9px 14px' }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#0D1E35' }}>{b.allottees?.[0]?.name}</div>
                      {b.allottees?.length > 1 && <div style={{ fontSize:11, color:'#6B7280' }}>+ {b.allottees.length-1} joint</div>}
                    </td>
                    <td style={{ padding:'9px 14px' }}>
                      <div style={{ fontSize:12.5, fontWeight:600, color:'#0D1E35' }}>{proj?.name||'—'}</div>
                      <div style={{ fontSize:11.5, color:'#4B5563', fontFamily:'monospace' }}>Unit {b.unit_no}</div>
                    </td>
                    <td style={{ padding:'9px 14px', fontSize:13, fontWeight:800, fontFamily:'monospace', color:'#0D1E35' }}>{inr(b.agreement_value)}</td>
                    <td style={{ padding:'9px 14px', fontSize:12.5, color:'#374151' }}>{fmtDate(b.booking_date)}</td>
                    <td style={{ padding:'9px 14px' }}><Badge value={b.status}/></td>
                    <td style={{ padding:'9px 14px' }}>
                      <span style={{
                        background:b.approval_status==='Approved'?'#DCFCE7':b.approval_status==='Rejected'?'#FEE2E2':'#FEF3C7',
                        color:b.approval_status==='Approved'?'#14532D':b.approval_status==='Rejected'?'#7F1D1D':'#78350F',
                        fontSize:10.5, fontWeight:700, padding:'2px 8px', borderRadius:10
                      }}>{b.approval_status||'Pending'}</span>
                    </td>
                    <td style={{ padding:'9px 14px' }}>
                      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                        <button onClick={()=>setViewModal(b)}
                          style={{ background:'#EAF0F8', border:'1px solid #C5D5E8', borderRadius:6, padding:'3px 9px', cursor:'pointer', fontSize:10.5, fontWeight:700, color:'#0D1E35' }}>
                          View Details
                        </button>
                        {canApprove && b.approval_status==='Pending' && (<>
                          <button onClick={()=>approveBooking(b)} style={{ background:'#DCFCE7', border:'1px solid #86EFAC', borderRadius:6, padding:'3px 9px', cursor:'pointer', fontSize:10.5, fontWeight:700, color:'#14532D' }}>Approve</button>
                          <button onClick={()=>{ setRejectModal(b); setRejectReason(''); }} style={{ background:'#FEE2E2', border:'1px solid #FCA5A5', borderRadius:6, padding:'3px 9px', cursor:'pointer', fontSize:10.5, fontWeight:700, color:'#7F1D1D' }}>Reject</button>
                        </>)}
                        {b.reject_reason && <div style={{ fontSize:10.5, color:'#DC2626' }} title={b.reject_reason}>Reason ⓘ</div>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* NEW BOOKING WIZARD MODAL */}
      <Modal open={open} onClose={()=>{ setOpen(false); setStep(0); setErrors({}); setUnitLocked(false); }}
        title="New Booking" width="max-w-3xl"
        footer={<>
          {step>0 && <button onClick={prevStep} className="btn-secondary" style={{ fontSize:13 }}><ChevronLeft size={13}/> Back</button>}
          <button onClick={()=>{ setOpen(false); setStep(0); setErrors({}); }} className="btn-secondary" style={{ fontSize:13 }}>Cancel</button>
          {step<3 ? <button onClick={nextStep} className="btn-primary" style={{ fontSize:13 }}>Next <ChevronRight size={13}/></button>
                  : <button onClick={submitBooking} className="btn-primary" style={{ fontSize:13 }}>Submit for Approval</button>}
        </>}>

        {/* Progress */}
        <div style={{ display:'flex', gap:4, marginBottom:22 }}>
          {STEPS.map((s,i)=>(
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
              <div style={{ width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, background:i<step?'#15803D':i===step?'#0D1E35':'#E5E7EB', color:i<=step?'#fff':'#6B7280' }}>
                {i<step?'✓':i+1}
              </div>
              <div style={{ fontSize:10.5, fontWeight:i===step?700:500, color:i===step?'#0D1E35':'#6B7280', textAlign:'center', lineHeight:1.3 }}>{s}</div>
              {i<STEPS.length-1 && <div style={{ position:'absolute', display:'none' }}/>}
            </div>
          ))}
        </div>

        {/* Step 1: Allottee */}
        {step===0 && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
            <F label="Full Name" required error={errors.allottee_name}><input style={errors.allottee_name?inpE:inp} value={form.allottee_name} onChange={set('allottee_name')} placeholder="Allottee full name"/></F>
            <F label="PAN Number" required error={errors.allottee_pan}><input style={errors.allottee_pan?inpE:inp} value={form.allottee_pan} onChange={e=>{ setForm(f=>({...f,allottee_pan:e.target.value.toUpperCase()})); setErrors(er=>({...er,allottee_pan:''})); }} placeholder="ABCDE1234F" maxLength={10}/></F>
            <F label="Mobile Number" required error={errors.allottee_phone}><input style={errors.allottee_phone?inpE:inp} value={form.allottee_phone} onChange={set('allottee_phone')} placeholder="10-digit mobile" maxLength={10}/></F>
            <F label="Email Address" error={errors.allottee_email}><input style={errors.allottee_email?inpE:inp} value={form.allottee_email} onChange={set('allottee_email')} placeholder="email@domain.com"/></F>
            <F label="Date of Birth"><input style={inp} type="date" value={form.allottee_dob} onChange={set('allottee_dob')}/></F>
            <F label="Occupation"><input style={inp} value={form.allottee_occupation} onChange={set('allottee_occupation')} placeholder="e.g. Service, Business"/></F>
            <F label="Address" span={2}><textarea style={{ ...inp, height:54, resize:'vertical' }} value={form.allottee_address} onChange={set('allottee_address')} placeholder="Residential address"/></F>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                <input type="checkbox" checked={form.joint_applicant} onChange={e=>setForm(f=>({...f,joint_applicant:e.target.checked}))} style={{ width:15, height:15 }}/>
                <span style={{ fontSize:13, fontWeight:600, color:'#374151' }}>Add Joint Applicant</span>
              </label>
            </div>
            {form.joint_applicant && (<>
              <F label="Joint Applicant Name" required error={errors.joint_name}><input style={errors.joint_name?inpE:inp} value={form.joint_name} onChange={set('joint_name')} placeholder="Joint applicant full name"/></F>
              <F label="Joint Applicant PAN" error={errors.joint_pan}><input style={inp} value={form.joint_pan} onChange={e=>setForm(f=>({...f,joint_pan:e.target.value.toUpperCase()}))} placeholder="ABCDE1234F" maxLength={10}/></F>
              <F label="Joint Applicant Phone"><input style={inp} value={form.joint_phone} onChange={set('joint_phone')} placeholder="10-digit mobile"/></F>
              <F label="Joint Applicant Email"><input style={inp} value={form.joint_email} onChange={set('joint_email')} placeholder="email@domain.com"/></F>
            </>)}
          </div>
        )}

        {/* Step 2: Property & Pricing */}
        {step===1 && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
            <F label="Project" required error={errors.project_id}>
              <select style={errors.project_id?{...sel,border:'1px solid #EF4444'}:sel}
                value={form.project_id} onChange={onProjectChange}
                disabled={unitLocked}>
                <option value="">— Select project —</option>
                {entityProjects.map(p=><option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </select>
              {unitLocked && <div style={{ fontSize:11, color:'#6B7280', marginTop:3 }}>Project locked — selected from Inventory</div>}
            </F>
            <F label="Unit / Flat No." required error={errors.unit_no}>
              <select style={errors.unit_no?{...sel,border:'1px solid #EF4444'}:sel}
                value={form.unit_no} onChange={onUnitChange}
                disabled={unitLocked || !form.project_id}>
                <option value="">— Select available unit —</option>
                {getAvailableUnits(selectedProject).map(u=><option key={u.unit_no} value={u.unit_no}>Unit {u.unit_no} — {u.unit_type} — {u.carpet_area} sqft</option>)}
                {/* Show locked unit even if not in available list */}
                {unitLocked && form.unit_no && !getAvailableUnits(selectedProject).find(u=>u.unit_no===form.unit_no) && (
                  <option value={form.unit_no}>Unit {form.unit_no} — {form.unit_type}</option>
                )}
              </select>
              {unitLocked && <div style={{ fontSize:11, color:'#6B7280', marginTop:3 }}>Unit locked — selected from Inventory</div>}
            </F>
            <F label="Unit Type"><input style={{ ...inp, background:'#F9FAFB' }} value={form.unit_type} readOnly placeholder="Auto-filled from unit selection"/></F>
            <F label="Carpet Area (sqft)"><input style={{ ...inp, background:'#F9FAFB' }} value={form.carpet_area} readOnly placeholder="Auto-filled"/></F>
            <F label="Agreement Value (₹)" required error={errors.agreement_value}>
              <input style={errors.agreement_value?inpE:inp} type="number" value={form.agreement_value} onChange={onAgreementValueChange} placeholder="Total agreement amount"/>
            </F>
            <F label="Base Rate (₹/sqft) — auto">
              <input style={{ ...inp, background:'#F9FAFB' }} value={form.base_rate} readOnly placeholder="Calculated"/>
            </F>
            <F label="GST Rate (%)">
              <div style={{ display:'flex', gap:10 }}>
                <select style={sel} value={form.gst_rate} onChange={e=>setForm(f=>({...f,gst_rate:Number(e.target.value)}))}>
                  <option value={1}>1% — Affordable Housing (≤₹45L)</option>
                  <option value={5}>5% — Standard</option>
                </select>
              </div>
              <div style={{ fontSize:11, color:'#1D4ED8', marginTop:3 }}>
                {form.unit_type==='Shop'||form.unit_type==='Office' ? 'Commercial unit — 5% GST applicable' :
                 Number(form.agreement_value)<=4500000 ? '≤₹45L residential — 1% Affordable Housing GST' :
                 '>₹45L residential — 5% Standard GST'}
              </div>
            </F>
            <F label="Booking Date" required error={errors.booking_date}><input style={errors.booking_date?inpE:inp} type="date" value={form.booking_date} onChange={set('booking_date')}/></F>
            <F label="Agreement Date"><input style={inp} type="date" value={form.agreement_date} onChange={set('agreement_date')}/></F>
            <F label="Expected Possession Date"><input style={inp} type="date" value={form.possession_date} onChange={set('possession_date')}/></F>
            {form.agreement_value && (
              <div style={{ gridColumn:'1/-1', background:'#EAF0F8', border:'1px solid #C5D5E8', borderRadius:10, padding:'11px 14px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, fontSize:12 }}>
                  <div><span style={{ color:'#4B5563', fontWeight:600 }}>Agreement Value: </span><strong style={{ color:'#0D1E35', fontFamily:'monospace' }}>{inr(Number(form.agreement_value))}</strong></div>
                  <div><span style={{ color:'#4B5563', fontWeight:600 }}>GST ({form.gst_rate}%): </span><strong style={{ color:'#78350F', fontFamily:'monospace' }}>{inr(Math.round(Number(form.agreement_value)*Number(form.gst_rate)/100))}</strong></div>
                  <div><span style={{ color:'#4B5563', fontWeight:600 }}>Total Payable: </span><strong style={{ color:'#14532D', fontFamily:'monospace' }}>{inr(Math.round(Number(form.agreement_value)*(1+Number(form.gst_rate)/100)))}</strong></div>
                </div>
              </div>
            )}
            <F label="Notes" span={2}><textarea style={{ ...inp, height:54, resize:'vertical' }} value={form.notes} onChange={set('notes')} placeholder="Any additional notes…"/></F>
          </div>
        )}

        {/* Step 3: Home Loan */}
        {step===2 && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
            <F label="Funding Type" span={2}>
              <div style={{ display:'flex', gap:10 }}>
                {['Own Fund','Home Loan','Mixed'].map(v=>(
                  <label key={v} style={{ flex:1, display:'flex', alignItems:'center', gap:7, cursor:'pointer', padding:'8px 14px', borderRadius:8, border:`2px solid ${form.funding_type===v?'#0D1E35':'#E5E7EB'}`, background:form.funding_type===v?'#EAF0F8':'#fff', justifyContent:'center' }}>
                    <input type="radio" name="funding" value={v} checked={form.funding_type===v} onChange={set('funding_type')} style={{ width:14, height:14 }}/>
                    <span style={{ fontSize:13, fontWeight:700, color:form.funding_type===v?'#0D1E35':'#6B7280' }}>{v}</span>
                  </label>
                ))}
              </div>
            </F>
            {(form.funding_type==='Home Loan'||form.funding_type==='Mixed') && (<>
              <F label="Bank Name"><input style={inp} value={form.loan_bank} onChange={set('loan_bank')} placeholder="e.g. SBI, HDFC"/></F>
              <F label="Branch"><input style={inp} value={form.loan_branch} onChange={set('loan_branch')} placeholder="Branch name"/></F>
              <F label="Loan Amount Requested (₹)"><input style={inp} type="number" value={form.loan_amount_requested} onChange={set('loan_amount_requested')} placeholder="0"/></F>
              <F label="Loan Amount Sanctioned (₹)"><input style={inp} type="number" value={form.loan_amount_sanctioned} onChange={set('loan_amount_sanctioned')} placeholder="0"/></F>
              <F label="Loan Amount Disbursed (₹)"><input style={inp} type="number" value={form.loan_amount_disbursed} onChange={set('loan_amount_disbursed')} placeholder="0"/></F>
              <F label="Loan Account No."><input style={inp} value={form.loan_account_no} onChange={set('loan_account_no')} placeholder="Loan account number"/></F>
              <F label="RM Name"><input style={inp} value={form.loan_rm} onChange={set('loan_rm')} placeholder="Relationship manager name"/></F>
              <F label="RM Phone"><input style={inp} value={form.loan_rm_phone} onChange={set('loan_rm_phone')} placeholder="RM mobile number"/></F>
              <F label="Sanction Date"><input style={inp} type="date" value={form.loan_sanction_date} onChange={set('loan_sanction_date')}/></F>
              <F label="Loan Stage"><select style={sel} value={form.loan_stage} onChange={set('loan_stage')}><option value="">Select stage…</option><option>Applied</option><option>Sanctioned</option><option>Disbursed</option><option>Closed</option></select></F>
            </>)}
            {form.funding_type==='Own Fund' && (
              <div style={{ gridColumn:'1/-1', background:'#F0FDF4', border:'1px solid #86EFAC', borderRadius:10, padding:'12px 16px', fontSize:13, color:'#14532D' }}>No home loan details needed for Own Fund bookings.</div>
            )}
          </div>
        )}

        {/* Step 4: Broker */}
        {step===3 && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
            <F label="Is a Broker Involved?" span={2}>
              <div style={{ display:'flex', gap:10 }}>
                {[false,true].map(v=>(
                  <label key={String(v)} style={{ flex:1, display:'flex', alignItems:'center', gap:7, cursor:'pointer', padding:'8px 14px', borderRadius:8, border:`2px solid ${form.broker_involved===v?'#0D1E35':'#E5E7EB'}`, background:form.broker_involved===v?'#EAF0F8':'#fff', justifyContent:'center' }}>
                    <input type="radio" name="broker_inv" checked={form.broker_involved===v} onChange={()=>setForm(f=>({...f,broker_involved:v}))} style={{ width:14, height:14 }}/>
                    <span style={{ fontSize:13, fontWeight:700, color:form.broker_involved===v?'#0D1E35':'#6B7280' }}>{v?'Yes':'No — Direct Sale'}</span>
                  </label>
                ))}
              </div>
            </F>
            {form.broker_involved && (<>
              <F label="Broker" required error={errors.broker_id}>
                <select style={sel} value={form.broker_id} onChange={set('broker_id')}>
                  <option value="">— Select registered broker —</option>
                  {allBrokers.map(b=><option key={b.id} value={b.id}>{b.firm_name} — {b.contact_person}</option>)}
                </select>
                {allBrokers.length===0 && <div style={{ fontSize:11, color:'#DC2626', marginTop:3 }}>No registered brokers. Add brokers in the Brokerage module first.</div>}
              </F>
              <F label="Brokerage Amount (₹)"><input style={inp} type="number" value={form.brokerage_amount} onChange={set('brokerage_amount')} placeholder="0"/></F>
            </>)}
            {/* Booking summary */}
            <div style={{ gridColumn:'1/-1', background:'#EAF0F8', border:'1px solid #C5D5E8', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:11.5, fontWeight:700, color:'#0D1E35', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.5px' }}>Booking Summary</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:12.5 }}>
                {[['Allottee',form.allottee_name],['Project',entityProjects.find(p=>p.id===Number(form.project_id))?.name||'—'],['Unit',`Unit ${form.unit_no}`],['Agreement Value',inr(Number(form.agreement_value))],['GST',`${form.gst_rate}%`],['Funding',form.funding_type]].map(([l,v])=>(
                  <div key={l}><span style={{ color:'#4B5563', fontWeight:600 }}>{l}: </span><strong style={{ color:'#0D1E35' }}>{v}</strong></div>
                ))}
              </div>
              <div style={{ marginTop:10, padding:'8px 12px', background:'#FEF3C7', border:'1px solid #FCD34D', borderRadius:8, fontSize:12, color:'#78350F' }}>
                After submission, this booking will be sent to the Director for approval before it becomes active.
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* THANK YOU / CONFIRMATION MODAL */}
      {thankYou && (
        <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)' }} onClick={()=>setThankYou(null)}/>
          <div style={{ position:'relative', background:'#fff', borderRadius:20, padding:'40px 36px', maxWidth:480, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', textAlign:'center' }}>
            {/* Success icon */}
            <div style={{ width:72, height:72, borderRadius:'50%', background:'#DCFCE7', border:'4px solid #86EFAC', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 22px', fontSize:34 }}>
              ✓
            </div>
            <div style={{ fontSize:22, fontWeight:800, color:'#0D1E35', marginBottom:8 }}>
              Booking Submitted!
            </div>
            <div style={{ fontSize:14, color:'#4B5563', lineHeight:1.7, marginBottom:20 }}>
              Your booking request has been submitted successfully.<br/>
              You will be notified once the Director reviews and approves it.
            </div>

            {/* Booking details box */}
            <div style={{ background:'#F8FAFC', border:'1px solid #E5E7EB', borderRadius:12, padding:'16px 20px', marginBottom:24, textAlign:'left' }}>
              {[
                ['Booking Reference', thankYou.booking_no],
                ['Allottee',          thankYou.allottee_name],
                ['Unit',              `Unit ${thankYou.unit_no}`],
                ['Project',           thankYou.project_name],
                ['Status',            'Pending Director Approval'],
              ].map(([l,v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #F3F4F6', fontSize:13 }}>
                  <span style={{ color:'#6B7280', fontWeight:600 }}>{l}</span>
                  <span style={{ color:'#0D1E35', fontWeight:700, fontFamily:l==='Booking Reference'?'monospace':'inherit' }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ background:'#EAF0F8', border:'1px solid #C5D5E8', borderRadius:10, padding:'10px 14px', marginBottom:24, fontSize:12.5, color:'#1E3A8A', lineHeight:1.6 }}>
              The Director will review this booking and approve or reject it. Once approved, your payment schedule will be activated automatically.
            </div>

            <button onClick={()=>setThankYou(null)}
              style={{ width:'100%', background:'#0D1E35', color:'#fff', border:'none', borderRadius:11, padding:'12px 0', fontSize:14, fontWeight:700, cursor:'pointer' }}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      <Modal open={!!rejectModal} onClose={()=>setRejectModal(null)} title={`Reject Booking — ${rejectModal?.booking_no}`}
        footer={<><button onClick={()=>setRejectModal(null)} className="btn-secondary" style={{ fontSize:13 }}>Cancel</button><button onClick={rejectBooking} style={{ background:'#DC2626', color:'#fff', border:'none', borderRadius:8, padding:'7px 18px', cursor:'pointer', fontSize:13, fontWeight:700 }}>Confirm Rejection</button></>}>
        <div>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:5 }}>Rejection Reason <span style={{ color:'#DC2626' }}>*</span></label>
          <textarea style={{ ...inp, height:80, resize:'vertical' }} value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="State the reason for rejection…"/>
        </div>
      </Modal>

      {/* VIEW DETAILS MODAL */}
      {/* VIEW DETAILS MODAL */}
      {viewModal && (
        <ViewDetailsModal
          booking={viewModal}
          entityProjects={entityProjects}
          allBrokers={allBrokers}
          canApprove={canApprove}
          onClose={()=>setViewModal(null)}
          onApprove={()=>{ approveBooking(viewModal); setViewModal(null); }}
          onReject={()=>{ setRejectModal(viewModal); setRejectReason(''); setViewModal(null); }}
        />
      )}
    </div>
  );
}
