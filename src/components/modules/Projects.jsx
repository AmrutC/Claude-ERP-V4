import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { can } from '../../data';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { inr, fmtDate } from '../../utils';
import { Plus, Edit2, AlertTriangle, Lock, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';

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

const UNIT_TYPES     = ['1RK','1BHK','2BHK','3BHK','4BHK','Shop','Office','Parking'];
const APPROVAL_TYPES = ['NA Order','Layout','Building Plan','Environment','Fire NOC','Water NOC','OC','CC','RERA','Other'];
const STEPS          = ['Basic Details','Wings & Units','Payment Milestones','RERA & Approvals','Financial'];

// ── Floor config helper ────────────────────────────────────────────────────
// floor_configs: [{floor_no, floor_label, unit_count}]
// Build unit_rows from floor_configs
function buildUnitRowsFromFloors(floor_configs, wings, usesWings) {
  const rows = [];
  const wingList = usesWings && wings.length > 0 ? wings : [''];
  wingList.forEach(wing => {
    floor_configs.forEach(fc => {
      for (let u = 1; u <= Number(fc.unit_count||0); u++) {
        const prefix = wing ? `${wing}-` : '';
        const floorPart = fc.floor_no === 0 ? 'G' : String(fc.floor_no);
        rows.push({
          _key:        `${wing||'X'}-${fc.floor_no}-${u}`,
          wing,
          floor_no:    fc.floor_no,
          floor_label: fc.floor_label || (fc.floor_no === 0 ? 'Ground Floor' : `Floor ${fc.floor_no}`),
          unit_no:     `${prefix}${floorPart}0${u}`,
          unit_type:   fc.floor_no === 0 ? 'Shop' : '2BHK',
          carpet_area: '',
          balcony_area:'',
          buildup_area:'',
          base_rate:   '',
          is_landowner: false,  // JV landowner flat
          landowner_name: '',
        });
      }
    });
  });
  return rows;
}

// Build default floor_configs when floor count is entered
function buildFloorConfigs(numFloors) {
  const configs = [];
  // Ground floor (floor_no = 0)
  configs.push({ floor_no:0, floor_label:'Ground Floor', unit_count:'' });
  for (let i = 1; i <= Number(numFloors||0); i++) {
    configs.push({ floor_no:i, floor_label:`Floor ${i}`, unit_count:'' });
  }
  return configs;
}

const DEFAULT_MILESTONES = [
  { id:1,  name:'Booking Advance',      pct:10 },
  { id:2,  name:'Agreement Execution',  pct:15 },
  { id:3,  name:'Excavation & Plinth',  pct:10 },
  { id:4,  name:'Ground Floor Slab',    pct:15 },
  { id:5,  name:'1st Floor Slab',       pct:15 },
  { id:6,  name:'2nd Floor Slab',       pct:10 },
  { id:7,  name:'Terrace Slab',         pct:10 },
  { id:8,  name:'Plaster & Finishing',  pct:8  },
  { id:9,  name:'Registration',         pct:5  },
  { id:10, name:'Possession',           pct:2  },
];

const EMPTY_PROJECT = {
  code:'', name:'', survey_no:'', village:'', taluka:'', district:'', pin:'',
  total_plot_area:'', total_saleable_area:'', start_date:'', expected_completion:'',
  status:'Planning', notes:'',
  is_jv: false,  // joint venture flag
  uses_wings:false, wings:[],
  num_upper_floors: '',
  floor_configs: [],
  unit_rows: [],
  milestone_schedule: DEFAULT_MILESTONES.map(m=>({...m})),
  rera_applicable:'Yes', rera_exemption_reason:'',
  rera_reg_no:'', rera_reg_date:'', rera_expiry_date:'', rera_next_update:'',
  oc_cc_status:'Pending', approvals:[],
  turnkey_contract_value:'',
};

let projCounter = 0;

export default function Projects() {
  const { user, activeEntity, projects, setProjects, addToast } = useAppStore();
  const canEdit = !user || user.role==='super_admin' || user.role==='director' || can(user,'canRegisterProject');

  const [open, setOpen]               = useState(false);
  const [form, setForm]               = useState(EMPTY_PROJECT);
  const [editingId, setEditingId]     = useState(null);
  const [step, setStep]               = useState(0);
  const [errors, setErrors]           = useState({});
  const [approvalModal, setApprovalModal] = useState(false);
  const [approvalForm, setApprovalForm]   = useState({ type:'NA Order', authority:'', date_applied:'', date_received:'', expiry_date:'', status:'Pending' });
  const [editApprovalId, setEditApprovalId] = useState(null);

  const entityProjects = (projects||[]).filter(p => p.entity_id === activeEntity?.id);
  const set = k => e => { setForm(f=>({...f,[k]:e.target.value})); setErrors(er=>({...er,[k]:''})); };

  // ── When number of upper floors changes, rebuild floor_configs ────────
  function onUpperFloorsChange(val) {
    const configs = buildFloorConfigs(val);
    const rows = buildUnitRowsFromFloors(configs, form.wings, form.uses_wings);
    setForm(f=>({ ...f, num_upper_floors:val, floor_configs:configs, unit_rows:rows }));
    setErrors(er=>({...er, num_upper_floors:''}));
  }

  // ── When unit count for a floor changes, rebuild only that floor's rows ─
  function onFloorUnitCountChange(floorNo, val) {
    const configs = form.floor_configs.map(fc =>
      fc.floor_no===floorNo ? {...fc, unit_count:val} : fc
    );
    const rows = buildUnitRowsFromFloors(configs, form.wings, form.uses_wings);
    setForm(f=>({ ...f, floor_configs:configs, unit_rows:rows }));
  }

  // ── When floor label changes ──────────────────────────────────────────
  function onFloorLabelChange(floorNo, val) {
    const configs = form.floor_configs.map(fc =>
      fc.floor_no===floorNo ? {...fc, floor_label:val} : fc
    );
    setForm(f=>({ ...f, floor_configs:configs }));
  }

  // ── When wings change, rebuild all rows ──────────────────────────────
  function onWingsChange(val) {
    const wings = val.split(',').map(w=>w.trim()).filter(Boolean);
    const rows = buildUnitRowsFromFloors(form.floor_configs, wings, form.uses_wings);
    setForm(f=>({ ...f, wings, unit_rows:rows }));
  }

  function onUsesWingsChange(v) {
    const rows = buildUnitRowsFromFloors(form.floor_configs, form.wings, v);
    setForm(f=>({ ...f, uses_wings:v, unit_rows:rows }));
  }

  // ── Update individual unit row field ──────────────────────────────────
  function updateUnitRow(key, field, val) {
    setForm(f=>({ ...f, unit_rows:f.unit_rows.map(r => r._key===key ? {...r,[field]:val} : r) }));
  }

  function toggleLandowner(key) {
    setForm(f=>({ ...f, unit_rows:f.unit_rows.map(r =>
      r._key===key ? {...r, is_landowner:!r.is_landowner, landowner_name:r.is_landowner?'':r.landowner_name} : r
    )}));
  }

  function updateMilestone(idx, field, val) {
    const ms = [...form.milestone_schedule];
    ms[idx] = { ...ms[idx], [field]: field==='pct'?Number(val):val };
    setForm(f=>({...f,milestone_schedule:ms}));
    setErrors(er=>({...er,milestones:''}));
  }
  function addMilestone()    { setForm(f=>({...f,milestone_schedule:[...f.milestone_schedule,{id:Date.now(),name:'',pct:0}]})); }
  function removeMilestone(idx) { setForm(f=>({...f,milestone_schedule:f.milestone_schedule.filter((_,i)=>i!==idx)})); }

  function saveApproval() {
    if (!approvalForm.type) return;
    const updated = editApprovalId
      ? (form.approvals||[]).map(a=>a.id===editApprovalId?{...approvalForm,id:editApprovalId}:a)
      : [...(form.approvals||[]),{...approvalForm,id:Date.now()}];
    setForm(f=>({...f,approvals:updated}));
    setApprovalModal(false);
    setApprovalForm({type:'NA Order',authority:'',date_applied:'',date_received:'',expiry_date:'',status:'Pending'});
    setEditApprovalId(null);
  }

  function validateStep(s) {
    const e = {};
    if (s===0) {
      if (!form.code.trim()) e.code = 'Project code is required.';
      if (!form.name.trim()) e.name = 'Project name is required.';
    }
    if (s===1) {
      if (!form.num_upper_floors && form.num_upper_floors!==0) e.num_upper_floors='Enter number of upper floors (0 if ground only).';
      const anyUnitConfigured = form.floor_configs.some(fc=>Number(fc.unit_count)>0);
      if (!anyUnitConfigured) e.floor_configs='Enter unit count for at least one floor.';
    }
    if (s===2) {
      const total = form.milestone_schedule.reduce((s,m)=>s+Number(m.pct||0),0);
      if (total!==100) e.milestones=`Milestone percentages must total 100%. Current: ${total}%`;
    }
    return e;
  }

  function goNext() {
    const errs = validateStep(step);
    if (Object.keys(errs).length>0) { setErrors(errs); return; }
    setErrors({});
    setStep(s=>Math.min(s+1,STEPS.length-1));
  }
  function goBack() { setErrors({}); setStep(s=>Math.max(s-1,0)); }

  function save() {
    const errs = validateStep(step);
    if (Object.keys(errs).length>0) { setErrors(errs); return; }
    const totalUnits = form.unit_rows.length;
    const landownerUnits = form.unit_rows.filter(r=>r.is_landowner).length;
    if (editingId) {
      setProjects(ps=>ps.map(p=>p.id===editingId?{...p,...form,total_units:totalUnits,landowner_units:landownerUnits}:p));
      addToast('Project updated.','success');
    } else {
      projCounter++;
      setProjects(ps=>[...(ps||[]),{...form,id:projCounter,entity_id:activeEntity?.id,total_units:totalUnits,landowner_units:landownerUnits}]);
      addToast(`Project "${form.name}" registered.`,'success');
    }
    setOpen(false); setStep(0); setErrors({});
  }

  function openNew() {
    setForm({...EMPTY_PROJECT,milestone_schedule:DEFAULT_MILESTONES.map(m=>({...m}))});
    setEditingId(null); setStep(0); setErrors({}); setOpen(true);
  }
  function openEdit(p) {
    if (!canEdit) { addToast('Only Director or Admin can edit projects.','error'); return; }
    setForm({...p}); setEditingId(p.id); setStep(0); setErrors({}); setOpen(true);
  }

  const pctTotal = form.milestone_schedule.reduce((s,m)=>s+Number(m.pct||0),0);

  // Group unit_rows by wing → floor
  const unitsByWingFloor = {};
  (form.unit_rows||[]).forEach(r=>{
    const w = r.wing||'—';
    if (!unitsByWingFloor[w]) unitsByWingFloor[w]={};
    if (!unitsByWingFloor[w][r.floor_no]) unitsByWingFloor[w][r.floor_no]=[];
    unitsByWingFloor[w][r.floor_no].push(r);
  });

  const totalUnits      = form.unit_rows.length;
  const landownerCount  = form.unit_rows.filter(r=>r.is_landowner).length;
  const salableCount    = totalUnits - landownerCount;

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:13, color:'#4B5563' }}>
          {entityProjects.length} project{entityProjects.length!==1?'s':''} · {activeEntity?.name}
        </div>
        {canEdit
          ? <button onClick={openNew} className="btn-primary" style={{ fontSize:12.5 }}><Plus size={13}/> Register Project</button>
          : <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#6B7280', background:'#F3F4F6', border:'1px solid #E5E7EB', borderRadius:8, padding:'6px 12px' }}>
              <Lock size={12}/> Director / Admin can register projects
            </div>
        }
      </div>

      {/* Project cards */}
      {entityProjects.length===0 ? (
        <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:60, textAlign:'center' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>🏗️</div>
          <div style={{ fontSize:14, fontWeight:600, color:'#6B7280' }}>No projects registered yet</div>
          {canEdit && <div style={{ fontSize:12, color:'#9CA3AF', marginTop:4 }}>Click "Register Project" to add your first project</div>}
        </div>
      ) : entityProjects.map(p=>{
        const reradays = p.rera_expiry_date ? Math.ceil((new Date(p.rera_expiry_date)-new Date())/86400000) : null;
        const reraWarn = p.rera_applicable==='Yes' && reradays!==null && reradays<=90;
        return (
          <div key={p.id} style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:20, marginBottom:12, boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                  <span style={{ background:'#0D1E35', color:'#F0C040', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:5, fontFamily:'monospace' }}>{p.code}</span>
                  <span style={{ fontSize:17, fontWeight:800, color:'#0D1E35' }}>{p.name}</span>
                  {p.is_jv && <span style={{ background:'#EDE9FE', color:'#4C1D95', fontSize:10.5, fontWeight:700, padding:'2px 8px', borderRadius:10 }}>Joint Venture</span>}
                </div>
                <div style={{ fontSize:12.5, color:'#4B5563' }}>
                  {[p.survey_no,p.village,p.taluka,p.district,p.pin].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <Badge value={p.status}/>
                {canEdit && <button onClick={()=>openEdit(p)} style={{ background:'#F3F4F6', border:'1px solid #E5E7EB', borderRadius:8, padding:'5px 12px', cursor:'pointer', fontSize:12, fontWeight:600, color:'#374151', display:'flex', alignItems:'center', gap:5 }}><Edit2 size={11}/> Edit</button>}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:8, marginBottom:10 }}>
              {[
                ['Total Units',    p.total_units||0],
                ['Salable',        (p.total_units||0)-(p.landowner_units||0)],
                ['Landowner',      p.landowner_units||0],
                ['Floors',         p.num_upper_floors!==''? `G + ${p.num_upper_floors} upper` : '—'],
                ['Contract Value', p.turnkey_contract_value?inr(p.turnkey_contract_value):'—'],
                ['Milestones',     (p.milestone_schedule||[]).length+' stages'],
              ].map(([l,v])=>(
                <div key={l} style={{ background:'#F8FAFC', borderRadius:8, padding:'8px 10px' }}>
                  <div style={{ fontSize:9.5, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:2 }}>{l}</div>
                  <div style={{ fontSize:12.5, fontWeight:700, color:'#0D1E35' }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <span style={{ fontSize:11, fontWeight:700, color:'#6B7280' }}>RERA:</span>
              <Badge value={p.rera_applicable}/>
              {p.rera_reg_no && <span style={{ fontSize:11.5, fontWeight:600, color:'#0D1E35', fontFamily:'monospace' }}>{p.rera_reg_no}</span>}
              {reradays!==null && <span style={{ fontSize:11, color:'#4B5563' }}>Expires in {reradays}d</span>}
            </div>
            {reraWarn && (
              <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:8, padding:'7px 12px', background:'#FEF3C7', border:'1px solid #FCD34D', borderRadius:8 }}>
                <AlertTriangle size={13} style={{ color:'#D97706' }}/>
                <span style={{ fontSize:12, fontWeight:600, color:'#78350F' }}>RERA expires in {reradays} days</span>
              </div>
            )}
          </div>
        );
      })}

      {/* ── WIZARD MODAL ─────────────────────────────────────────────── */}
      <Modal open={open} onClose={()=>{ setOpen(false); setErrors({}); }}
        title={editingId?`Edit — ${form.name}`:'Register New Project'}
        width="max-w-5xl"
        footer={
          <div style={{ display:'flex', justifyContent:'space-between', width:'100%' }}>
            <button onClick={()=>{ setOpen(false); setErrors({}); }} className="btn-secondary" style={{ fontSize:13 }}>Cancel</button>
            <div style={{ display:'flex', gap:8 }}>
              {step>0 && <button onClick={goBack} className="btn-secondary" style={{ fontSize:13 }}><ChevronLeft size={13}/> Back</button>}
              {step<STEPS.length-1
                ? <button onClick={goNext} className="btn-primary" style={{ fontSize:13 }}>Next <ChevronRight size={13}/></button>
                : <button onClick={save} className="btn-primary" style={{ fontSize:13 }}><CheckCircle2 size={13}/> {editingId?'Save Changes':'Register Project'}</button>
              }
            </div>
          </div>
        }>

        {/* Step indicator */}
        <div style={{ display:'flex', marginBottom:22 }}>
          {STEPS.map((s,i)=>(
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5, position:'relative' }}>
              {i>0&&<div style={{ position:'absolute', top:13, right:'50%', width:'100%', height:2, background:i<=step?'#0D1E35':'#E5E7EB', zIndex:0 }}/>}
              <div style={{ position:'relative', zIndex:1, width:26, height:26, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, background:i<step?'#15803D':i===step?'#0D1E35':'#E5E7EB', color:i<=step?'#fff':'#6B7280' }}>
                {i<step?'✓':i+1}
              </div>
              <div style={{ fontSize:10.5, fontWeight:i===step?700:500, color:i===step?'#0D1E35':'#9CA3AF', textAlign:'center' }}>{s}</div>
            </div>
          ))}
        </div>

        {/* ── STEP 1: Basic Details ───────────────────────────────────── */}
        {step===0 && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
            <F label="Project Code" required error={errors.code}>
              <input style={errors.code?inpE:inp} value={form.code} onChange={set('code')} placeholder="e.g. VH01"/>
            </F>
            <F label="Project Name" required error={errors.name}>
              <input style={errors.name?inpE:inp} value={form.name} onChange={set('name')} placeholder="e.g. Vision Harmony"/>
            </F>
            <F label="Status">
              <select style={sel} value={form.status} onChange={set('status')}>
                <option>Planning</option><option>Under Construction</option><option>Completed</option><option>On Hold</option>
              </select>
            </F>
            <F label="Joint Venture?">
              <div style={{ display:'flex', gap:10, height:36, alignItems:'center' }}>
                {[false,true].map(v=>(
                  <label key={String(v)} style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', padding:'7px 16px', borderRadius:8, border:`2px solid ${form.is_jv===v?'#4C1D95':'#E5E7EB'}`, background:form.is_jv===v?'#EDE9FE':'#fff' }}>
                    <input type="radio" checked={form.is_jv===v} onChange={()=>setForm(f=>({...f,is_jv:v}))} style={{ width:13,height:13 }}/>
                    <span style={{ fontSize:13, fontWeight:700, color:form.is_jv===v?'#4C1D95':'#6B7280' }}>{v?'Yes — Joint Venture':'No'}</span>
                  </label>
                ))}
              </div>
            </F>
            <F label="Survey / Plot No."><input style={inp} value={form.survey_no} onChange={set('survey_no')} placeholder="Plot No. 32"/></F>
            <F label="Village / Area"><input style={inp} value={form.village} onChange={set('village')} placeholder="Pushpak Nagar"/></F>
            <F label="Taluka"><input style={inp} value={form.taluka} onChange={set('taluka')} placeholder="Panvel"/></F>
            <F label="District"><input style={inp} value={form.district} onChange={set('district')} placeholder="Raigad"/></F>
            <F label="PIN Code"><input style={inp} value={form.pin} onChange={set('pin')} placeholder="410206"/></F>
            <F label="Total Plot Area (sqft)"><input style={inp} type="number" value={form.total_plot_area} onChange={set('total_plot_area')}/></F>
            <F label="Total Saleable Area (sqft)"><input style={inp} type="number" value={form.total_saleable_area} onChange={set('total_saleable_area')}/></F>
            <F label="Start Date"><input style={inp} type="date" value={form.start_date} onChange={set('start_date')}/></F>
            <F label="Expected Completion"><input style={inp} type="date" value={form.expected_completion} onChange={set('expected_completion')}/></F>
            <F label="Notes" span={2}>
              <textarea style={{ ...inp, height:54, resize:'vertical' }} value={form.notes} onChange={set('notes')} placeholder="Any additional notes…"/>
            </F>
          </div>
        )}

        {/* ── STEP 2: Wings & Units (per-floor config) ─────────────────── */}
        {step===1 && (
          <div>
            {/* Wings */}
            <div style={{ background:'#F8FAFC', border:'1px solid #E5E7EB', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#0D1E35', marginBottom:10 }}>Wing / Block Configuration</div>
              <div style={{ display:'flex', gap:12, marginBottom:12 }}>
                {[false,true].map(v=>(
                  <label key={String(v)} style={{ flex:1, display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'8px 14px', borderRadius:8, border:`2px solid ${form.uses_wings===v?'#0D1E35':'#E5E7EB'}`, background:form.uses_wings===v?'#EAF0F8':'#fff', justifyContent:'center' }}>
                    <input type="radio" checked={form.uses_wings===v} onChange={()=>onUsesWingsChange(v)} style={{ width:14,height:14 }}/>
                    <span style={{ fontSize:13, fontWeight:700, color:form.uses_wings===v?'#0D1E35':'#6B7280' }}>{v?'Has Wings (A, B, C…)':'No Wings — Single Block'}</span>
                  </label>
                ))}
              </div>
              {form.uses_wings && (
                <F label="Wing Names (comma separated)">
                  <input style={inp} value={form.wings.join(',')} onChange={e=>onWingsChange(e.target.value)} placeholder="A, B, C"/>
                </F>
              )}
            </div>

            {/* Number of upper floors */}
            <div style={{ background:'#F8FAFC', border:'1px solid #E5E7EB', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#0D1E35', marginBottom:10 }}>Floor Count</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:13, alignItems:'start' }}>
                <F label="Number of Upper Floors (excluding Ground)" required error={errors.num_upper_floors}>
                  <input style={errors.num_upper_floors?inpE:inp} type="number" min="0" value={form.num_upper_floors}
                    onChange={e=>onUpperFloorsChange(e.target.value)} placeholder="e.g. 7"/>
                </F>
                <div style={{ paddingTop:28, fontSize:12.5, color:'#4B5563', lineHeight:1.7 }}>
                  Ground Floor is always included. Enter how many additional floors exist above it.<br/>
                  <span style={{ color:'#6B7280', fontSize:12 }}>Example: G + 7 upper floors → enter 7</span>
                </div>
              </div>
            </div>

            {/* Per-floor unit count config */}
            {form.floor_configs.length > 0 && (
              <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, overflow:'hidden', marginBottom:14 }}>
                <div style={{ padding:'10px 16px', background:'#F9FAFB', borderBottom:'1px solid #E5E7EB', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#0D1E35' }}>Units Per Floor — configure each floor individually</div>
                  <div style={{ fontSize:12, color:'#4B5563' }}>Total so far: <strong>{totalUnits}</strong> units</div>
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr style={{ background:'#F9FAFB', borderBottom:'2px solid #E5E7EB' }}>
                    {['Floor','Floor Label','No. of Units on this floor',''].map(h=>(
                      <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.4px' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {form.floor_configs.map((fc,i)=>(
                      <tr key={fc.floor_no} style={{ borderBottom:'1px solid #F3F4F6', background:i%2===0?'#fff':'#FAFAFA' }}>
                        <td style={{ padding:'9px 14px' }}>
                          <span style={{ background:fc.floor_no===0?'#FEF3C7':'#EAF0F8', color:fc.floor_no===0?'#78350F':'#0D1E35', fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:8 }}>
                            {fc.floor_no===0?'G':fc.floor_no}
                          </span>
                        </td>
                        <td style={{ padding:'9px 14px' }}>
                          <input style={{ ...inp, padding:'5px 9px', fontSize:12.5 }} value={fc.floor_label}
                            onChange={e=>onFloorLabelChange(fc.floor_no, e.target.value)}
                            placeholder={fc.floor_no===0?'Ground Floor':`Floor ${fc.floor_no}`}/>
                        </td>
                        <td style={{ padding:'9px 14px', width:220 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <input style={{ ...inp, padding:'5px 9px', fontSize:12.5, width:90 }} type="number" min="0"
                              value={fc.unit_count} onChange={e=>onFloorUnitCountChange(fc.floor_no,e.target.value)}
                              placeholder="0"/>
                            <span style={{ fontSize:12, color:'#6B7280' }}>
                              {Number(fc.unit_count)>0 ? `→ ${fc.unit_count} unit${Number(fc.unit_count)>1?'s':''}` : ''}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding:'9px 14px', fontSize:11.5, color:'#9CA3AF' }}>
                          {fc.floor_no===0 ? '(Shops / Stilt / Parking typical)' : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background:'#0D1E35' }}>
                      <td colSpan={2} style={{ padding:'9px 14px', fontSize:12, fontWeight:700, color:'#fff' }}>TOTAL</td>
                      <td style={{ padding:'9px 14px', fontSize:14, fontWeight:800, color:'#F0C040' }}>
                        {form.floor_configs.reduce((s,fc)=>s+Number(fc.unit_count||0),0)} units
                      </td>
                      <td/>
                    </tr>
                  </tfoot>
                </table>
                {errors.floor_configs && <div style={{ background:'#FEE2E2', padding:'8px 14px', fontSize:12, color:'#7F1D1D' }}>{errors.floor_configs}</div>}
              </div>
            )}

            {/* Unit detail table — only shown once unit counts are entered */}
            {totalUnits > 0 && (
              <div>
                {/* JV landowner note */}
                {form.is_jv && (
                  <div style={{ background:'#EDE9FE', border:'1px solid #C4B5FD', borderRadius:10, padding:'10px 14px', marginBottom:12, fontSize:12.5, color:'#4C1D95', fontWeight:600 }}>
                    🏠 This is a Joint Venture project. Mark landowner units with the "LO" toggle — they will be locked from sales inventory.
                  </div>
                )}

                <div style={{ background:'#EAF0F8', border:'1px solid #C5D5E8', borderRadius:10, padding:'9px 14px', marginBottom:12, fontSize:12.5, color:'#0D1E35' }}>
                  <strong>{totalUnits} total units</strong> · <span style={{ color:'#14532D' }}>{salableCount} salable</span>
                  {form.is_jv && landownerCount>0 && <> · <span style={{ color:'#4C1D95' }}>{landownerCount} landowner (locked)</span></>}
                </div>

                {Object.entries(unitsByWingFloor).map(([wing, floorMap])=>(
                  <div key={wing} style={{ marginBottom:16 }}>
                    {form.uses_wings && (
                      <div style={{ background:'#0D1E35', color:'#F0C040', padding:'5px 14px', borderRadius:'8px 8px 0 0', fontSize:12, fontWeight:700, display:'inline-block' }}>
                        Wing {wing}
                      </div>
                    )}
                    <div style={{ border:'1px solid #E5E7EB', borderRadius:form.uses_wings?'0 8px 8px 8px':8, overflowX:'auto' }}>
                      <table style={{ width:'100%', borderCollapse:'collapse', minWidth:720 }}>
                        <thead>
                          <tr style={{ background:'#F9FAFB', borderBottom:'2px solid #E5E7EB' }}>
                            {['Floor','Unit No.','Type','Carpet (sqft)','Balcony (sqft)','Built-up (sqft)','Rate (₹/sqft)', form.is_jv?'Landowner?':''].filter(Boolean).map(h=>(
                              <th key={h} style={{ padding:'7px 9px', textAlign:'left', fontSize:9.5, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.4px', whiteSpace:'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(floorMap)
                            .sort((a,b)=>Number(a[0])-Number(b[0]))
                            .flatMap(([floorNo, units])=>
                              units.map((u,ui)=>{
                                const isLO = u.is_landowner;
                                return (
                                  <tr key={u._key} style={{ borderBottom:'1px solid #F3F4F6', background:isLO?'#F5F0FF':ui%2===0?'#fff':'#FAFAFA' }}>
                                    {ui===0 && (
                                      <td rowSpan={units.length} style={{ padding:'8px 10px', fontSize:11.5, fontWeight:700, color:'#0D1E35', background:'#EAF0F8', borderRight:'1px solid #E5E7EB', textAlign:'center', verticalAlign:'middle', whiteSpace:'nowrap' }}>
                                        {u.floor_label || (Number(floorNo)===0?'Ground':floorNo)}
                                      </td>
                                    )}
                                    <td style={{ padding:'5px 7px' }}>
                                      <input style={{ ...inp, padding:'4px 7px', fontSize:12, background:isLO?'#EDE9FE':'#fff' }}
                                        value={u.unit_no} onChange={e=>updateUnitRow(u._key,'unit_no',e.target.value)}/>
                                    </td>
                                    <td style={{ padding:'5px 7px', minWidth:90 }}>
                                      <select style={{ ...sel, padding:'4px 7px', fontSize:12, background:isLO?'#EDE9FE':'#fff', minWidth:88 }}
                                        value={u.unit_type} onChange={e=>updateUnitRow(u._key,'unit_type',e.target.value)}>
                                        {UNIT_TYPES.map(t=><option key={t}>{t}</option>)}
                                      </select>
                                    </td>
                                    <td style={{ padding:'5px 7px' }}>
                                      <input style={{ ...inp, padding:'4px 7px', fontSize:12 }} type="number"
                                        value={u.carpet_area} placeholder="sqft"
                                        onChange={e=>updateUnitRow(u._key,'carpet_area',e.target.value)}/>
                                    </td>
                                    <td style={{ padding:'5px 7px' }}>
                                      <input style={{ ...inp, padding:'4px 7px', fontSize:12 }} type="number"
                                        value={u.balcony_area} placeholder="sqft"
                                        onChange={e=>updateUnitRow(u._key,'balcony_area',e.target.value)}/>
                                    </td>
                                    <td style={{ padding:'5px 7px' }}>
                                      <input style={{ ...inp, padding:'4px 7px', fontSize:12, background:'#F9FAFB' }} type="number"
                                        value={u.carpet_area&&u.balcony_area?String(Number(u.carpet_area)+Number(u.balcony_area)):u.buildup_area}
                                        placeholder="auto"
                                        onChange={e=>updateUnitRow(u._key,'buildup_area',e.target.value)}/>
                                    </td>
                                    <td style={{ padding:'5px 7px' }}>
                                      <input style={{ ...inp, padding:'4px 7px', fontSize:12 }} type="number"
                                        value={u.base_rate} placeholder="₹/sqft"
                                        onChange={e=>updateUnitRow(u._key,'base_rate',e.target.value)}/>
                                    </td>
                                    {form.is_jv && (
                                      <td style={{ padding:'5px 10px', textAlign:'center' }}>
                                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                                          <button onClick={()=>toggleLandowner(u._key)}
                                            style={{ background:isLO?'#4C1D95':'#F3F4F6', color:isLO?'#fff':'#6B7280', border:`1px solid ${isLO?'#4C1D95':'#E5E7EB'}`, borderRadius:6, padding:'3px 10px', cursor:'pointer', fontSize:11, fontWeight:700 }}>
                                            {isLO?'🔒 LO':'Mark LO'}
                                          </button>
                                          {isLO && (
                                            <input style={{ ...inp, padding:'3px 6px', fontSize:11, width:100 }}
                                              value={u.landowner_name} placeholder="Owner name"
                                              onChange={e=>updateUnitRow(u._key,'landowner_name',e.target.value)}/>
                                          )}
                                        </div>
                                      </td>
                                    )}
                                  </tr>
                                );
                              })
                            )
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
                <div style={{ fontSize:11.5, color:'#6B7280' }}>Built-up area = Carpet + Balcony (auto). You can override it.</div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Payment Milestones ───────────────────────────────── */}
        {step===2 && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#0D1E35' }}>Payment Milestone Schedule</div>
                <div style={{ fontSize:12, color:'#4B5563', marginTop:2 }}>All bookings in this project will follow this schedule. Must total 100%.</div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <div style={{ fontSize:13, fontWeight:700, padding:'4px 12px', borderRadius:8, background:pctTotal===100?'#DCFCE7':'#FEE2E2', color:pctTotal===100?'#14532D':'#7F1D1D', fontFamily:'monospace' }}>
                  {pctTotal}%
                </div>
                <button onClick={addMilestone} className="btn-secondary" style={{ fontSize:12 }}><Plus size={12}/> Add Stage</button>
              </div>
            </div>
            {errors.milestones && <div style={{ background:'#FEE2E2', border:'1px solid #FCA5A5', borderRadius:9, padding:'8px 12px', marginBottom:12, fontSize:12, color:'#7F1D1D' }}>{errors.milestones}</div>}
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ background:'#F9FAFB', borderBottom:'2px solid #E5E7EB' }}>
                {['#','Stage Name','%',''].map(h=><th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.4px' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {form.milestone_schedule.map((m,i)=>(
                  <tr key={m.id} style={{ borderBottom:'1px solid #F3F4F6' }}>
                    <td style={{ padding:'8px 12px', fontSize:12, color:'#6B7280', width:32 }}>{i+1}</td>
                    <td style={{ padding:'8px 12px' }}>
                      <input style={{ ...inp, padding:'5px 8px' }} value={m.name} onChange={e=>updateMilestone(i,'name',e.target.value)} placeholder="Stage name"/>
                    </td>
                    <td style={{ padding:'8px 12px', width:150 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <input style={{ ...inp, padding:'5px 8px', width:70 }} type="number" min="0" max="100" value={m.pct} onChange={e=>updateMilestone(i,'pct',e.target.value)}/>
                        <span style={{ fontSize:13, color:'#374151' }}>%</span>
                      </div>
                    </td>
                    <td style={{ padding:'8px 12px' }}>
                      <button onClick={()=>removeMilestone(i)} style={{ background:'#FEE2E2', border:'1px solid #FCA5A5', borderRadius:6, padding:'3px 8px', cursor:'pointer', fontSize:11, fontWeight:600, color:'#7F1D1D' }}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── STEP 4: RERA & Approvals ────────────────────────────────── */}
        {step===3 && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
            <F label="RERA Applicable" span={2}>
              <div style={{ display:'flex', gap:10 }}>
                {['Yes','No','Exempt'].map(v=>(
                  <label key={v} style={{ flex:1, display:'flex', alignItems:'center', gap:7, cursor:'pointer', padding:'8px 14px', borderRadius:8, border:`2px solid ${form.rera_applicable===v?'#0D1E35':'#E5E7EB'}`, background:form.rera_applicable===v?'#EAF0F8':'#fff', justifyContent:'center' }}>
                    <input type="radio" value={v} checked={form.rera_applicable===v} onChange={set('rera_applicable')} style={{ width:14,height:14 }}/>
                    <span style={{ fontSize:13, fontWeight:700, color:form.rera_applicable===v?'#0D1E35':'#6B7280' }}>{v}</span>
                  </label>
                ))}
              </div>
            </F>
            {form.rera_applicable==='Exempt' && (
              <F label="Exemption Reason" span={2}>
                <select style={sel} value={form.rera_exemption_reason} onChange={set('rera_exemption_reason')}>
                  <option value="">Select reason…</option>
                  <option>Plot area less than 500 sq.m</option>
                  <option>Number of apartments less than 8</option>
                  <option>Renovation / repair project</option>
                </select>
              </F>
            )}
            {form.rera_applicable==='Yes' && (<>
              <F label="RERA Reg. No."><input style={inp} value={form.rera_reg_no} onChange={set('rera_reg_no')} placeholder="P52000XXXXXXX"/></F>
              <F label="Registration Date"><input style={inp} type="date" value={form.rera_reg_date} onChange={set('rera_reg_date')}/></F>
              <F label="Expiry Date"><input style={inp} type="date" value={form.rera_expiry_date} onChange={set('rera_expiry_date')}/></F>
              <F label="Next Quarterly Update"><input style={inp} type="date" value={form.rera_next_update} onChange={set('rera_next_update')}/></F>
            </>)}
            {editingId && (
              <div style={{ gridColumn:'1/-1', borderTop:'1px solid #F3F4F6', paddingTop:14, marginTop:4 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#0D1E35' }}>Approvals Tracker</div>
                  <button onClick={()=>{ setApprovalForm({type:'NA Order',authority:'',date_applied:'',date_received:'',expiry_date:'',status:'Pending'}); setEditApprovalId(null); setApprovalModal(true); }} className="btn-secondary" style={{ fontSize:11.5 }}><Plus size={11}/> Add</button>
                </div>
                {(form.approvals||[]).length===0
                  ? <div style={{ fontSize:12, color:'#9CA3AF', textAlign:'center', padding:16 }}>No approvals recorded.</div>
                  : <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead><tr style={{ background:'#F9FAFB', borderBottom:'2px solid #E5E7EB' }}>
                      {['Type','Authority','Applied','Received','Expiry','Status',''].map(h=><th key={h} style={{ padding:'7px 10px', textAlign:'left', fontSize:9.5, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.4px', whiteSpace:'nowrap' }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {(form.approvals||[]).map((a,i)=>(
                        <tr key={a.id} style={{ borderBottom:'1px solid #F3F4F6', background:i%2===0?'#fff':'#FAFAFA' }}>
                          <td style={{ padding:'7px 10px', fontSize:12.5, fontWeight:600 }}>{a.type}</td>
                          <td style={{ padding:'7px 10px', fontSize:12 }}>{a.authority||'—'}</td>
                          <td style={{ padding:'7px 10px', fontSize:12 }}>{fmtDate(a.date_applied)||'—'}</td>
                          <td style={{ padding:'7px 10px', fontSize:12 }}>{fmtDate(a.date_received)||'—'}</td>
                          <td style={{ padding:'7px 10px', fontSize:12 }}>{fmtDate(a.expiry_date)||'—'}</td>
                          <td style={{ padding:'7px 10px' }}><Badge value={a.status}/></td>
                          <td style={{ padding:'7px 10px' }}>
                            <button onClick={()=>{ setApprovalForm({...a}); setEditApprovalId(a.id); setApprovalModal(true); }} style={{ background:'#F3F4F6', border:'1px solid #E5E7EB', borderRadius:6, padding:'2px 8px', cursor:'pointer', fontSize:11, fontWeight:600 }}>Edit</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                }
              </div>
            )}
          </div>
        )}

        {/* ── STEP 5: Financial + Summary ─────────────────────────────── */}
        {step===4 && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
            <F label="Turnkey Contract Value (₹)" span={2}>
              <input style={inp} type="number" value={form.turnkey_contract_value} onChange={set('turnkey_contract_value')} placeholder="Total construction contract value"/>
            </F>
            <div style={{ gridColumn:'1/-1', background:'#F8FAFC', border:'1px solid #E5E7EB', borderRadius:12, padding:'16px 18px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12 }}>Project Summary</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                {[
                  ['Project', `${form.code} — ${form.name}`],
                  ['Type', form.is_jv?'Joint Venture':'Own Development'],
                  ['Location', [form.village,form.taluka,form.district].filter(Boolean).join(', ')||'—'],
                  ['Total Floors', form.floor_configs.length>0 ? `G + ${form.num_upper_floors} upper` : '—'],
                  ['Total Units', totalUnits],
                  ['Salable Units', salableCount],
                  ['Landowner Units', landownerCount || '0'],
                  ['Wings', form.uses_wings&&form.wings.length>0?form.wings.join(', '):'No wings'],
                  ['Milestones', `${form.milestone_schedule.length} stages (${pctTotal}%)`],
                  ['RERA', form.rera_applicable],
                  ['Status', form.status],
                  ['Contract Value', form.turnkey_contract_value?inr(Number(form.turnkey_contract_value)):'Not entered'],
                ].map(([l,v])=>(
                  <div key={l} style={{ background:'#fff', borderRadius:8, padding:'8px 11px', border:'1px solid #E5E7EB' }}>
                    <div style={{ fontSize:9.5, fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:2 }}>{l}</div>
                    <div style={{ fontSize:12.5, fontWeight:600, color:'#0D1E35' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            {pctTotal!==100 && (
              <div style={{ gridColumn:'1/-1', background:'#FEE2E2', border:'1px solid #FCA5A5', borderRadius:10, padding:'10px 14px', fontSize:12.5, color:'#7F1D1D', fontWeight:600 }}>
                ⚠ Milestones total {pctTotal}% — must be 100%. Click Back to fix.
              </div>
            )}
            <div style={{ gridColumn:'1/-1', background:'#DCFCE7', border:'1px solid #86EFAC', borderRadius:10, padding:'10px 14px', fontSize:12.5, color:'#14532D' }}>
              Review all details above. Click "Register Project" to save.
            </div>
          </div>
        )}
      </Modal>

      {/* Approval sub-modal */}
      <Modal open={approvalModal} onClose={()=>setApprovalModal(false)} title={editApprovalId?'Edit Approval':'Add Approval'}
        footer={<><button onClick={()=>setApprovalModal(false)} className="btn-secondary" style={{ fontSize:13 }}>Cancel</button><button onClick={saveApproval} className="btn-primary" style={{ fontSize:13 }}>Save</button></>}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
          <F label="Type"><select style={sel} value={approvalForm.type} onChange={e=>setApprovalForm(f=>({...f,type:e.target.value}))}>{APPROVAL_TYPES.map(t=><option key={t}>{t}</option>)}</select></F>
          <F label="Authority"><input style={inp} value={approvalForm.authority} onChange={e=>setApprovalForm(f=>({...f,authority:e.target.value}))} placeholder="e.g. CIDCO"/></F>
          <F label="Date Applied"><input style={inp} type="date" value={approvalForm.date_applied} onChange={e=>setApprovalForm(f=>({...f,date_applied:e.target.value}))}/></F>
          <F label="Date Received"><input style={inp} type="date" value={approvalForm.date_received} onChange={e=>setApprovalForm(f=>({...f,date_received:e.target.value}))}/></F>
          <F label="Expiry Date"><input style={inp} type="date" value={approvalForm.expiry_date} onChange={e=>setApprovalForm(f=>({...f,expiry_date:e.target.value}))}/></F>
          <F label="Status"><select style={sel} value={approvalForm.status} onChange={e=>setApprovalForm(f=>({...f,status:e.target.value}))}><option>Pending</option><option>Applied</option><option>Received</option><option>Expired</option></select></F>
        </div>
      </Modal>
    </div>
  );
}
