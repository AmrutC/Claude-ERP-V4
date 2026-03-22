import React, { useState, useRef } from 'react';
import { useAppStore } from '../../stores/appStore';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { inr, fmtDate } from '../../utils';
import { Plus, Search, Upload, FileText, ChevronRight } from 'lucide-react';

const DEPTS=['Management','Sales','Accounts','Legal','HR','Admin','Operations','Design','Site'];
const ATT_COLORS={ Present:{bg:'#DCFCE7',text:'#14532D'}, Absent:{bg:'#FEE2E2',text:'#7F1D1D'}, 'Half Day':{bg:'#FEF3C7',text:'#78350F'}, Leave:{bg:'#EDE9FE',text:'#4C1D95'}, Holiday:{bg:'#F3F4F6',text:'#374151'} };
const EMPTY_E={ name:'', designation:'', department:'Operations', phone:'', email:'', pan:'', doj:new Date().toISOString().slice(0,10), monthly_salary:'', status:'Active' };
const DEMO_EMP=[
  {id:1,emp_code:'EMP001',name:'Neeraj Bhandare',designation:'Architect',department:'Design',phone:'9876500002',email:'neeraj@email.com',pan:'ABCDE1234F',doj:'2025-01-01',monthly_salary:75000,status:'Active'},
  {id:2,emp_code:'EMP002',name:'Suresh Kamble',designation:'Site Supervisor',department:'Site',phone:'9876500003',email:'',pan:'',doj:'2025-03-01',monthly_salary:35000,status:'Active'},
  {id:3,emp_code:'EMP003',name:'Priya Sharma',designation:'Accounts Executive',department:'Accounts',phone:'9876500004',email:'priya@email.com',pan:'',doj:'2025-06-01',monthly_salary:28000,status:'Active'},
];
const MONTHS_LIST=['January','February','March','April','May','June','July','August','September','October','November','December'];
const COMPANY={name:'Vision Grroup',entity:'Vision Estate Holdings Pvt Ltd',address:'Panvel, Raigad, Maharashtra 410206',phone:'9876540000',email:'hr@visiongrroup.in'};
const inp={width:'100%',border:'1px solid #D1D5DB',borderRadius:8,padding:'7px 10px',fontSize:13,color:'#111827',background:'#fff',outline:'none',fontFamily:'Inter,system-ui,sans-serif'};
const sel={...inp,cursor:'pointer'};
const F=({label,required,children,span})=>(
  <div style={{gridColumn:span?`span ${span}`:''}}>
    <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4B5563',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>
      {label}{required&&<span style={{color:'#DC2626',marginLeft:2}}>*</span>}
    </label>
    {children}
  </div>
);

function printDoc(html,title){
  const w=window.open('','_blank','width=794,height=1000');
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:32px}.no-print{margin-bottom:16px}@media print{.no-print{display:none}body{padding:0}}</style></head><body><div class="no-print"><button onclick="window.print()" style="background:#0D1E35;color:#fff;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:700;margin-right:8px">🖨 Print / Save PDF</button><button onclick="window.close()" style="background:#F3F4F6;color:#374151;border:1px solid #E5E7EB;padding:8px 18px;border-radius:6px;cursor:pointer;font-size:13px">Close</button><span style="margin-left:12px;font-size:12px;color:#6B7280">Print dialog → Save as PDF</span></div>${html}</body></html>`);
  w.document.close();
}

function buildSalarySlip(emp,monthLabel,year,pd,wd=26){
  const basic=Math.round(emp.monthly_salary*.5),hra=Math.round(emp.monthly_salary*.2),conv=Math.round(emp.monthly_salary*.1),spec=emp.monthly_salary-basic-hra-conv;
  const earned=Math.round(emp.monthly_salary*pd/wd),pf=Math.round(Math.min(basic,15000)*.12),esic=earned<=21000?Math.round(earned*.0075):0,pt=earned>15000?200:earned>10000?150:0,totalDed=pf+esic+pt,netPay=earned-totalDed;
  return`<div style="border:2px solid #0D1E35;border-radius:4px;max-width:730px;margin:0 auto"><div style="background:#0D1E35;color:#fff;padding:16px 22px;display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:20px;font-weight:700;color:#F0C040">VISION GRROUP</div><div style="font-size:11px;opacity:.65;margin-top:2px">${COMPANY.entity} · ${COMPANY.address}</div></div><div style="text-align:right"><div style="font-size:16px;font-weight:700;color:#F0C040">SALARY SLIP</div><div style="font-size:12px;opacity:.7">${monthLabel} ${year}</div></div></div><div style="padding:16px 22px;border-bottom:1px solid #E5E7EB"><table style="width:100%;font-size:12.5px"><tr><td style="padding:4px 0;color:#6B7280;width:25%">Employee Name</td><td style="font-weight:700;color:#0D1E35">${emp.name}</td><td style="padding:4px 0;color:#6B7280;width:25%">Employee Code</td><td style="font-weight:700;font-family:monospace">${emp.emp_code}</td></tr><tr><td style="padding:4px 0;color:#6B7280">Designation</td><td style="font-weight:600">${emp.designation}</td><td style="padding:4px 0;color:#6B7280">Department</td><td>${emp.department}</td></tr><tr><td style="padding:4px 0;color:#6B7280">Date of Joining</td><td>${fmtDate(emp.doj)}</td><td style="padding:4px 0;color:#6B7280">PAN</td><td style="font-family:monospace">${emp.pan||'—'}</td></tr><tr><td style="padding:4px 0;color:#6B7280">Working Days</td><td>${wd}</td><td style="padding:4px 0;color:#6B7280">Present Days</td><td style="font-weight:700;color:#14532D">${pd}</td></tr></table></div><div style="display:grid;grid-template-columns:1fr 1fr;padding:16px 22px;gap:24px"><div><div style="font-size:11px;font-weight:700;color:#0D1E35;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;border-bottom:2px solid #0D1E35;padding-bottom:4px">Earnings</div>${[['Basic Salary',basic],['HRA',hra],['Conveyance',conv],['Special Allowance',spec]].map(([l,v])=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #F3F4F6;font-size:12.5px"><span style="color:#374151">${l}</span><span style="font-family:monospace;font-weight:600">${inr(v)}</span></div>`).join('')}<div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:800;font-size:13px;color:#14532D;border-top:2px solid #0D1E35;margin-top:4px"><span>Gross Earned</span><span style="font-family:monospace">${inr(earned)}</span></div></div><div><div style="font-size:11px;font-weight:700;color:#0D1E35;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;border-bottom:2px solid #DC2626;padding-bottom:4px">Deductions</div>${[['Provident Fund (12%)',pf],['ESIC (0.75%)',esic],['Professional Tax',pt],['TDS',0]].map(([l,v])=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #F3F4F6;font-size:12.5px"><span style="color:#374151">${l}</span><span style="font-family:monospace;font-weight:600;color:${v>0?'#DC2626':'#9CA3AF'}">${v>0?inr(v):'—'}</span></div>`).join('')}<div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:800;font-size:13px;color:#DC2626;border-top:2px solid #DC2626;margin-top:4px"><span>Total Deductions</span><span style="font-family:monospace">${inr(totalDed)}</span></div></div></div><div style="background:#0D1E35;padding:14px 22px;display:flex;justify-content:space-between;align-items:center"><div style="color:#fff;font-size:14px;font-weight:700">NET PAY</div><div style="color:#F0C040;font-size:22px;font-weight:800;font-family:monospace">${inr(netPay)}</div></div><div style="padding:12px 22px;font-size:11px;color:#6B7280;display:flex;justify-content:space-between"><span>Computer generated salary slip.</span><span>For ${COMPANY.entity} — Authorised Signatory</span></div></div>`;
}

function buildJoiningLetter(emp){
  const today=new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
  return`<div style="max-width:730px;margin:0 auto;font-size:13px;line-height:1.8"><div style="text-align:center;margin-bottom:20px"><div style="font-size:22px;font-weight:700;color:#0D1E35">VISION GRROUP</div><div style="font-size:12px;color:#6B7280">${COMPANY.entity} · ${COMPANY.address}</div><div style="border-bottom:2px solid #0D1E35;margin-top:10px"></div></div><div style="margin-bottom:16px"><div><strong>Date:</strong> ${today}</div><div><strong>Ref:</strong> VEH/HR/JL/${emp.emp_code}</div></div><p>To,<br><strong>${emp.name}</strong>${emp.phone?`<br>Phone: ${emp.phone}`:''}</p><p style="margin-top:12px"><strong>Subject: Appointment Letter — ${emp.designation}, ${emp.department} Department</strong></p><p style="margin-top:12px">Dear <strong>${emp.name}</strong>,</p><p style="margin-top:12px">We are pleased to offer you the position of <strong>${emp.designation}</strong> in the <strong>${emp.department}</strong> department at ${COMPANY.entity}, effective <strong>${fmtDate(emp.doj)}</strong>.</p><table style="width:100%;margin:14px 0;border-collapse:collapse;font-size:12.5px">${[['Designation',emp.designation],['Department',emp.department],['Employee Code',emp.emp_code],['Date of Joining',fmtDate(emp.doj)],['Monthly Gross Salary',inr(emp.monthly_salary)],['Work Location','Vision Harmony Site, Panvel, Raigad'],['Working Hours','9:00 AM – 6:00 PM, Monday to Saturday']].map(([l,v])=>`<tr><td style="padding:6px 12px;border:1px solid #E5E7EB;color:#6B7280;font-weight:600;width:40%;background:#F9FAFB">${l}</td><td style="padding:6px 12px;border:1px solid #E5E7EB;font-weight:700;color:#0D1E35">${v}</td></tr>`).join('')}</table><p>Please report on your date of joining with: Aadhaar Card, PAN Card, last employer's relieving letter (if any), bank account details, and 2 passport photos.</p><p style="margin-top:12px">We look forward to a rewarding association with you.</p><div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:20px"><div><div style="border-top:1px solid #374151;padding-top:6px;font-size:12px">Authorised Signatory<br><strong>${COMPANY.entity}</strong></div></div><div><div style="border-top:1px solid #374151;padding-top:6px;font-size:12px">Acceptance by Employee<br><strong>${emp.name}</strong></div></div></div></div>`;
}

function buildWarningLetter(emp,reason,details,wno){
  const today=new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
  return`<div style="max-width:730px;margin:0 auto;font-size:13px;line-height:1.8"><div style="text-align:center;margin-bottom:20px"><div style="font-size:22px;font-weight:700;color:#0D1E35">VISION GRROUP</div><div style="font-size:12px;color:#6B7280">${COMPANY.entity} · ${COMPANY.address}</div><div style="border-bottom:2px solid #DC2626;margin-top:10px"></div></div><div style="background:#FEE2E2;border:1px solid #FCA5A5;border-radius:6px;padding:10px 16px;margin-bottom:20px;text-align:center;font-weight:700;color:#7F1D1D;font-size:14px;letter-spacing:.5px">WARNING LETTER — CONFIDENTIAL</div><div style="margin-bottom:16px"><div><strong>Date:</strong> ${today}</div><div><strong>Ref No.:</strong> VEH/HR/WL/${wno}</div></div><p>To,<br><strong>${emp.name}</strong><br>Employee Code: <strong>${emp.emp_code}</strong><br>${emp.designation}, ${emp.department} Department</p><p style="margin-top:12px"><strong>Subject: Written Warning — ${reason}</strong></p><p style="margin-top:12px">Dear <strong>${emp.name}</strong>,</p><p style="margin-top:12px">This letter is a formal written warning regarding: <strong>${reason}</strong>.</p><p style="margin-top:12px"><strong>Details:</strong></p><div style="background:#FEF3C7;border-left:4px solid #D97706;padding:12px 16px;margin:12px 0;border-radius:0 6px 6px 0">${details}</div><p>This is a violation of company policy. Any repetition may result in further disciplinary action including termination. You are required to submit a written explanation within <strong>3 working days</strong>.</p><div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:20px"><div><div style="border-top:1px solid #374151;padding-top:6px;font-size:12px">HR Department<br><strong>${COMPANY.entity}</strong></div></div><div><div style="border-top:1px solid #374151;padding-top:6px;font-size:12px">Employee Acknowledgement<br><strong>${emp.name}</strong> — Date: ____________</div></div></div></div>`;
}

export default function HR(){
  const {addToast}=useAppStore();
  const [employees,setEmployees]=useState([]);
  const [tab,setTab]=useState('employees');
  const [empModal,setEmpModal]=useState(false);
  const [form,setForm]=useState(EMPTY_E);
  const [editingId,setEditingId]=useState(null);
  const [attDate,setAttDate]=useState(new Date().toISOString().slice(0,10));
  const [attendance,setAttendance]=useState({});
  const [search,setSearch]=useState('');
  // Biometric
  const [bioStep,setBioStep]=useState('upload');
  const [bioRaw,setBioRaw]=useState([]);
  const [bioHeaders,setBioHeaders]=useState([]);
  const [bioMap,setBioMap]=useState({emp_name:'',date:'',status:''});
  const [bioPreview,setBioPreview]=useState([]);
  const [bioResult,setBioResult]=useState(null);
  const bioRef=useRef();
  // Documents
  const [docModal,setDocModal]=useState(false);
  const [docType,setDocType]=useState('salary');
  const [docEmpId,setDocEmpId]=useState('');
  const [salMonth,setSalMonth]=useState(String(new Date().getMonth()));
  const [salYear,setSalYear]=useState(String(new Date().getFullYear()));
  const [warnReason,setWarnReason]=useState('');
  const [warnDetails,setWarnDetails]=useState('');

  const set=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
  const totalPayroll=(employees||[]).filter(e=>e.status==='Active').reduce((s,e)=>s+(e.monthly_salary||0),0);
  const activeEmp=(employees||[]).filter(e=>e.status==='Active');
  const filtered=(employees||[]).filter(e=>!search||e.name.toLowerCase().includes(search.toLowerCase())||e.department.toLowerCase().includes(search.toLowerCase()));
  const dayAtt=attendance[attDate]||{};
  const month=attDate.slice(0,7);
  const monthDays=Object.keys(attendance).filter(d=>d.startsWith(month));
  function getSummary(id){let p=0,a=0,h=0,l=0;monthDays.forEach(d=>{const s=attendance[d]?.[id];if(s==='Present')p++;else if(s==='Absent')a++;else if(s==='Half Day')h++;else if(s==='Leave')l++;});return{p,a,h,l};}
  function markAtt(id,s){setAttendance(a=>({...a,[attDate]:{...(a[attDate]||{}),[id]:s}}));}
  function openNew(){setForm(EMPTY_E);setEditingId(null);setEmpModal(true);}
  function openEdit(e){setForm({...e});setEditingId(e.id);setEmpModal(true);}
  function saveEmp(){if(!form.name.trim()){alert('Name required.');return;}if(editingId){setEmployees(es=>es.map(e=>e.id===editingId?{...e,...form,monthly_salary:Number(form.monthly_salary)||0}:e));}else{const code=`EMP${String(employees.length+1).padStart(3,'0')}`;setEmployees(es=>[...es,{...form,id:Date.now(),emp_code:code,monthly_salary:Number(form.monthly_salary)||0}]);}addToast('Employee saved.','success');setEmpModal(false);}

  async function handleBioFile(e){
    const file=e.target.files[0];if(!file)return;
    try{
      const text=await file.text();
      const lines=text.split('\n').filter(l=>l.trim());
      const headers=lines[0].split(',').map(h=>h.trim().replace(/"/g,''));
      const rows=lines.slice(1).map(line=>{const cols=line.split(',');return headers.reduce((o,h,i)=>({...o,[h]:cols[i]?.trim().replace(/"/g,'')||''}),{});});
      setBioHeaders(headers);setBioRaw(rows);
      setBioMap({emp_name:headers.find(h=>/name/i.test(h))||'',date:headers.find(h=>/date/i.test(h))||'',status:headers.find(h=>/status|punch|att/i.test(h))||''});
      setBioStep('mapping');addToast(`Loaded ${rows.length} rows from ${file.name}`,'success');
    }catch{addToast('Error reading file. Use CSV or Excel exported as CSV.','error');}
  }

  function buildPreview(){if(!bioMap.emp_name||!bioMap.date){alert('Map Employee Name and Date first.');return;}setBioPreview(bioRaw.slice(0,10).map(r=>({emp_name:r[bioMap.emp_name]||'—',date:r[bioMap.date]||'—',status:bioMap.status?r[bioMap.status]||'Present':'Present'})));setBioStep('preview');}

  function confirmImport(){
    let imp=0,skip=0;const newAtt={...attendance};
    bioRaw.forEach(row=>{
      const en=row[bioMap.emp_name]?.trim(),dr=row[bioMap.date]?.trim(),st=bioMap.status?row[bioMap.status]?.trim()||'Present':'Present';
      if(!en||!dr){skip++;return;}
      const emp=employees.find(e=>e.name.toLowerCase().includes(en.toLowerCase())||en.toLowerCase().includes(e.name.toLowerCase()));
      if(!emp){skip++;return;}
      const d=new Date(dr);if(isNaN(d)){skip++;return;}
      const dk=d.toISOString().slice(0,10);
      if(newAtt[dk]?.[emp.id]){skip++;return;}
      const sl=st.toUpperCase();
      let as='Present';if(/^A$|ABSENT/.test(sl))as='Absent';else if(/HALF|H$|HD/.test(sl))as='Half Day';else if(/LEAVE|^L$/.test(sl))as='Leave';else if(/HOLIDAY/.test(sl))as='Holiday';
      newAtt[dk]={...(newAtt[dk]||{}),[emp.id]:as};imp++;
    });
    setAttendance(newAtt);setBioResult({imp,skip});setBioStep('done');addToast(`Imported ${imp} records.`,'success');
  }

  function generateDoc(){
    const emp=employees.find(e=>e.id===Number(docEmpId));if(!emp){alert('Select an employee.');return;}
    if(docType==='salary'){const mn=MONTHS_LIST[Number(salMonth)];const s=getSummary(emp.id);const pd=s.p+(s.h*.5)||26;printDoc(buildSalarySlip(emp,mn,salYear,pd),`Salary Slip — ${emp.name} — ${mn} ${salYear}`);}
    else if(docType==='joining'){printDoc(buildJoiningLetter(emp),`Joining Letter — ${emp.name}`);}
    else if(docType==='warning'){if(!warnReason.trim()){alert('Select warning reason.');return;}if(!warnDetails.trim()){alert('Enter warning details.');return;}printDoc(buildWarningLetter(emp,warnReason,warnDetails,`${Date.now()}`.slice(-3)),`Warning Letter — ${emp.name}`);}
  }

  const TABS=[['employees','Employees'],['attendance','Attendance'],['biometric','Biometric Import'],['payroll','Payroll'],['documents','Documents']];

  return(<div>
    {/* Stats */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
      {[{l:'Total',v:employees.length,c:'#1E3A8A'},{l:'Active',v:activeEmp.length,c:'#14532D'},{l:'Monthly Payroll',v:inr(totalPayroll),c:'#0D1E35'},{l:'Departments',v:new Set(employees.map(e=>e.department)).size,c:'#4C1D95'}].map(s=>(
        <div key={s.l} style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:12,padding:'12px 15px'}}>
          <div style={{fontSize:9.5,fontWeight:700,color:'#4B5563',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>{s.l}</div>
          <div style={{fontSize:17,fontWeight:800,color:s.c,fontFamily:'monospace'}}>{s.v}</div>
        </div>
      ))}
    </div>
    {/* Tabs */}
    <div style={{display:'flex',gap:3,background:'#F3F4F6',borderRadius:10,padding:3,marginBottom:16,overflowX:'auto'}}>
      {TABS.map(([id,label])=>(<button key={id} onClick={()=>setTab(id)} style={{flexShrink:0,padding:'6px 16px',borderRadius:7,fontSize:12.5,fontWeight:tab===id?700:500,color:tab===id?'#0D1E35':'#6B7280',background:tab===id?'#fff':'transparent',cursor:'pointer',boxShadow:tab===id?'0 1px 3px rgba(0,0,0,0.1)':'',border:'none'}}>{label}</button>))}
    </div>

    {/* EMPLOYEES */}
    {tab==='employees'&&(<>
      <div style={{display:'flex',gap:10,marginBottom:14}}>
        <div style={{flex:1,position:'relative'}}><Search size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#9CA3AF'}}/><input style={{...inp,paddingLeft:32}} placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <button onClick={openNew} className="btn-primary" style={{fontSize:12.5}}><Plus size={13}/> Add Employee</button>
      </div>
      <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:14,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#F9FAFB',borderBottom:'2px solid #E5E7EB'}}>
            {['Code','Name','Designation','Dept','Phone','Salary','DOJ','Status',''].map(h=><th key={h} style={{padding:'9px 12px',textAlign:'left',fontSize:10,fontWeight:700,color:'#4B5563',textTransform:'uppercase',letterSpacing:'0.5px',whiteSpace:'nowrap'}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {filtered.length===0?<tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'#9CA3AF',fontSize:13}}>No employees. Add one to get started.</td></tr>:
            filtered.map((e,i)=>(<tr key={e.id} style={{borderBottom:'1px solid #F3F4F6',background:i%2===0?'#fff':'#FAFAFA'}}>
              <td style={{padding:'9px 12px',fontSize:11.5,fontFamily:'monospace',color:'#6B7280'}}>{e.emp_code}</td>
              <td style={{padding:'9px 12px',fontSize:13,fontWeight:700,color:'#0D1E35'}}>{e.name}</td>
              <td style={{padding:'9px 12px',fontSize:12.5,color:'#374151'}}>{e.designation}</td>
              <td style={{padding:'9px 12px',fontSize:12.5,color:'#374151'}}>{e.department}</td>
              <td style={{padding:'9px 12px',fontSize:12.5,color:'#374151'}}>{e.phone}</td>
              <td style={{padding:'9px 12px',fontSize:13,fontWeight:700,fontFamily:'monospace',textAlign:'right',color:'#0D1E35'}}>{e.monthly_salary?inr(e.monthly_salary):'—'}</td>
              <td style={{padding:'9px 12px',fontSize:12,color:'#374151'}}>{fmtDate(e.doj)}</td>
              <td style={{padding:'9px 12px'}}><Badge value={e.status}/></td>
              <td style={{padding:'9px 12px'}}><button onClick={()=>openEdit(e)} style={{background:'#F3F4F6',border:'1px solid #E5E7EB',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:11.5,fontWeight:600,color:'#374151'}}>Edit</button></td>
            </tr>))}
          </tbody>
        </table>
      </div>
    </>)}

    {/* ATTENDANCE */}
    {tab==='attendance'&&(
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:14,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
          <div style={{padding:'13px 16px',borderBottom:'1px solid #F3F4F6',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:12,fontWeight:700,color:'#0D1E35'}}>Mark Attendance</span>
            <input type="date" value={attDate} onChange={e=>setAttDate(e.target.value)} style={{...inp,width:'auto',fontSize:12}}/>
          </div>
          <div style={{padding:'10px 14px'}}>
            {activeEmp.map(e=>{const st=dayAtt[e.id]||'';return(
              <div key={e.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid #F9FAFB'}}>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'#0D1E35'}}>{e.name}</div><div style={{fontSize:11,color:'#6B7280'}}>{e.designation}</div></div>
                <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                  {['Present','Absent','Half Day','Leave'].map(s=>{const c=ATT_COLORS[s];return(
                    <button key={s} onClick={()=>markAtt(e.id,s)} style={{background:st===s?c.bg:'#F9FAFB',border:`1px solid ${st===s?c.bg:'#E5E7EB'}`,borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:11,fontWeight:st===s?700:500,color:st===s?c.text:'#6B7280',transition:'all .12s'}}>
                      {s==='Half Day'?'½ Day':s}
                    </button>
                  );})}
                </div>
              </div>
            );})}
          </div>
        </div>
        <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:14,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
          <div style={{padding:'13px 16px',borderBottom:'1px solid #F3F4F6',fontSize:12,fontWeight:700,color:'#0D1E35'}}>Monthly Summary — {new Date(month+'-01').toLocaleString('default',{month:'long',year:'numeric'})}</div>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#F9FAFB',borderBottom:'2px solid #E5E7EB'}}>
              {['Employee','P','A','H','L','Earned'].map(h=><th key={h} style={{padding:'8px 12px',textAlign:h==='Employee'?'left':'center',fontSize:10,fontWeight:700,color:'#4B5563',textTransform:'uppercase',letterSpacing:'0.5px'}}>{h}</th>)}
            </tr></thead>
            <tbody>{activeEmp.map((e,i)=>{const s=getSummary(e.id);const earned=e.monthly_salary?Math.round((s.p+s.h*.5)/26*e.monthly_salary):0;return(
              <tr key={e.id} style={{borderBottom:'1px solid #F3F4F6',background:i%2===0?'#fff':'#FAFAFA'}}>
                <td style={{padding:'9px 12px',fontSize:13,fontWeight:600,color:'#0D1E35'}}>{e.name}</td>
                <td style={{padding:'9px 12px',textAlign:'center',fontSize:13,fontWeight:700,color:'#14532D'}}>{s.p}</td>
                <td style={{padding:'9px 12px',textAlign:'center',fontSize:13,fontWeight:700,color:'#7F1D1D'}}>{s.a}</td>
                <td style={{padding:'9px 12px',textAlign:'center',fontSize:13,fontWeight:700,color:'#78350F'}}>{s.h}</td>
                <td style={{padding:'9px 12px',textAlign:'center',fontSize:13,color:'#4C1D95'}}>{s.l}</td>
                <td style={{padding:'9px 12px',fontSize:13,fontWeight:700,fontFamily:'monospace',textAlign:'right',color:'#0D1E35'}}>{earned?inr(earned):'—'}</td>
              </tr>);})}</tbody>
          </table>
        </div>
      </div>
    )}

    {/* BIOMETRIC IMPORT */}
    {tab==='biometric'&&(
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        {/* Steps */}
        <div style={{display:'flex',gap:4,alignItems:'center'}}>
          {['Upload','Map Columns','Preview','Done'].map((s,i)=>{const cur={upload:0,mapping:1,preview:2,done:3}[bioStep];return(<React.Fragment key={s}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{width:24,height:24,borderRadius:'50%',background:i<=cur?'#0D1E35':'#E5E7EB',color:i<=cur?'#fff':'#9CA3AF',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center'}}>{i<cur?'✓':i+1}</div>
              <span style={{fontSize:12,fontWeight:i===cur?700:500,color:i===cur?'#0D1E35':'#9CA3AF'}}>{s}</span>
            </div>
            {i<3&&<div style={{flex:1,height:1,background:'#E5E7EB',maxWidth:40}}/>}
          </React.Fragment>);})}
        </div>

        {bioStep==='upload'&&(
          <div style={{background:'#fff',border:'2px dashed #D1D5DB',borderRadius:14,padding:40,textAlign:'center'}}>
            <Upload size={36} style={{color:'#9CA3AF',margin:'0 auto 12px'}}/>
            <div style={{fontSize:15,fontWeight:700,color:'#0D1E35',marginBottom:6}}>Upload Biometric Attendance File</div>
            <div style={{fontSize:12.5,color:'#6B7280',marginBottom:20,lineHeight:1.7}}>Export your biometric machine data as CSV or Excel.<br/>File should have columns: Employee Name, Date, Status (P/A/H/L).</div>
            <input ref={bioRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleBioFile} style={{display:'none'}}/>
            <button onClick={()=>bioRef.current?.click()} style={{background:'#0D1E35',color:'#fff',border:'none',borderRadius:9,padding:'10px 24px',cursor:'pointer',fontSize:13,fontWeight:700,display:'inline-flex',alignItems:'center',gap:8}}>
              <Upload size={14}/> Choose File (CSV / Excel)
            </button>
            <div style={{marginTop:16,background:'#EAF0F8',borderRadius:10,padding:'10px 14px',textAlign:'left',fontSize:12,color:'#1E3A8A',display:'inline-block',minWidth:380}}>
              <strong>Tip:</strong> Open your Excel export → Save As → CSV → upload here.
            </div>
          </div>
        )}

        {bioStep==='mapping'&&(
          <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:14,padding:'20px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
            <div style={{fontSize:14,fontWeight:700,color:'#0D1E35',marginBottom:4}}>Map Your Columns</div>
            <div style={{fontSize:12.5,color:'#6B7280',marginBottom:16}}>{bioRaw.length} rows detected. Match your file columns to the correct fields.</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:16}}>
              {[['Employee Name *','emp_name'],['Date *','date'],['Status (P/A/H/L)','status']].map(([label,key])=>(
                <div key={key}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4B5563',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>{label}</label>
                  <select style={sel} value={bioMap[key]} onChange={e=>setBioMap(m=>({...m,[key]:e.target.value}))}>
                    <option value="">— Not mapped —</option>
                    {bioHeaders.map(h=><option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{background:'#EAF0F8',borderRadius:9,padding:'9px 13px',fontSize:12,color:'#1E3A8A',marginBottom:14}}>
              <strong>Status auto-mapping:</strong> P / Present → Present &nbsp;·&nbsp; A / Absent → Absent &nbsp;·&nbsp; H / HD → Half Day &nbsp;·&nbsp; L / Leave → Leave &nbsp;·&nbsp; Holiday → Holiday
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setBioStep('upload')} className="btn-secondary" style={{fontSize:13}}>← Back</button>
              <button onClick={buildPreview} className="btn-primary" style={{fontSize:13}}>Preview First 10 Rows →</button>
            </div>
          </div>
        )}

        {bioStep==='preview'&&(
          <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:14,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
            <div style={{padding:'14px 18px',borderBottom:'1px solid #F3F4F6',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div><div style={{fontSize:14,fontWeight:700,color:'#0D1E35'}}>Preview — First 10 rows</div><div style={{fontSize:12,color:'#6B7280',marginTop:2}}>Verify mapping before importing all {bioRaw.length} records</div></div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>setBioStep('mapping')} className="btn-secondary" style={{fontSize:13}}>← Edit</button>
                <button onClick={confirmImport} className="btn-primary" style={{fontSize:13}}>✓ Import All {bioRaw.length} Rows</button>
              </div>
            </div>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr style={{background:'#F9FAFB',borderBottom:'2px solid #E5E7EB'}}>
                {['Name (from file)','Date','Status (from file)','→ Employee Match','→ App Status'].map(h=><th key={h} style={{padding:'8px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'#4B5563',textTransform:'uppercase',letterSpacing:'0.4px',whiteSpace:'nowrap'}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {bioPreview.map((row,i)=>{const emp=employees.find(e=>e.name.toLowerCase().includes(row.emp_name.toLowerCase())||row.emp_name.toLowerCase().includes(e.name.toLowerCase()));return(
                  <tr key={i} style={{borderBottom:'1px solid #F3F4F6',background:emp?'#fff':'#FFF5F5'}}>
                    <td style={{padding:'8px 14px',fontSize:12.5,color:'#374151'}}>{row.emp_name}</td>
                    <td style={{padding:'8px 14px',fontSize:12,fontFamily:'monospace',color:'#374151'}}>{row.date}</td>
                    <td style={{padding:'8px 14px',fontSize:12,color:'#374151'}}>{row.status}</td>
                    <td style={{padding:'8px 14px',fontSize:12.5,fontWeight:600,color:emp?'#14532D':'#DC2626'}}>{emp?emp.name:'⚠ Not matched'}</td>
                    <td style={{padding:'8px 14px'}}><span style={{background:ATT_COLORS[row.status]?.bg||'#F3F4F6',color:ATT_COLORS[row.status]?.text||'#374151',fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:10}}>{row.status}</span></td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
        )}

        {bioStep==='done'&&bioResult&&(
          <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:14,padding:40,textAlign:'center',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
            <div style={{width:60,height:60,borderRadius:'50%',background:'#DCFCE7',border:'3px solid #86EFAC',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:28}}>✓</div>
            <div style={{fontSize:18,fontWeight:800,color:'#14532D',marginBottom:16}}>Import Complete!</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,maxWidth:280,margin:'0 auto 20px'}}>
              <div style={{background:'#DCFCE7',borderRadius:10,padding:'12px 16px'}}><div style={{fontSize:11,fontWeight:700,color:'#14532D',textTransform:'uppercase',marginBottom:4}}>Imported</div><div style={{fontSize:24,fontWeight:800,color:'#14532D'}}>{bioResult.imp}</div></div>
              <div style={{background:'#FEF3C7',borderRadius:10,padding:'12px 16px'}}><div style={{fontSize:11,fontWeight:700,color:'#78350F',textTransform:'uppercase',marginBottom:4}}>Skipped</div><div style={{fontSize:24,fontWeight:800,color:'#78350F'}}>{bioResult.skip}</div></div>
            </div>
            <div style={{fontSize:12.5,color:'#6B7280',marginBottom:20}}>Skipped = employee not matched, invalid date, or duplicate entry.</div>
            <div style={{display:'flex',gap:10,justifyContent:'center'}}>
              <button onClick={()=>{setBioStep('upload');setBioRaw([]);setBioHeaders([]);setBioResult(null);setBioMap({emp_name:'',date:'',status:''});}} className="btn-secondary" style={{fontSize:13}}>Import Another File</button>
              <button onClick={()=>setTab('attendance')} className="btn-primary" style={{fontSize:13}}>View Attendance →</button>
            </div>
          </div>
        )}
      </div>
    )}

    {/* PAYROLL */}
    {tab==='payroll'&&(
      <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:14,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
        <div style={{padding:'13px 18px',borderBottom:'1px solid #F3F4F6',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:12,fontWeight:700,color:'#0D1E35',textTransform:'uppercase',letterSpacing:'0.5px'}}>Payroll Summary</span>
          <span style={{fontSize:12,fontWeight:700,color:'#0D1E35'}}>Total: {inr(totalPayroll)}/month</span>
        </div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#F9FAFB',borderBottom:'2px solid #E5E7EB'}}>
            {['Code','Name','Department','Designation','Monthly Salary','Status'].map(h=><th key={h} style={{padding:'9px 16px',textAlign:'left',fontSize:10,fontWeight:700,color:'#4B5563',textTransform:'uppercase',letterSpacing:'0.5px'}}>{h}</th>)}
          </tr></thead>
          <tbody>
            {(employees||[]).map((e,i)=>(<tr key={e.id} style={{borderBottom:'1px solid #F3F4F6',background:i%2===0?'#fff':'#FAFAFA'}}>
              <td style={{padding:'10px 16px',fontSize:11.5,fontFamily:'monospace',color:'#6B7280'}}>{e.emp_code}</td>
              <td style={{padding:'10px 16px',fontSize:13,fontWeight:700,color:'#0D1E35'}}>{e.name}</td>
              <td style={{padding:'10px 16px',fontSize:12.5,color:'#374151'}}>{e.department}</td>
              <td style={{padding:'10px 16px',fontSize:12.5,color:'#374151'}}>{e.designation}</td>
              <td style={{padding:'10px 16px',fontSize:13,fontWeight:800,fontFamily:'monospace',textAlign:'right',color:'#0D1E35'}}>{e.monthly_salary?inr(e.monthly_salary):'—'}</td>
              <td style={{padding:'10px 16px'}}><Badge value={e.status}/></td>
            </tr>))}
            <tr style={{background:'#0D1E35'}}>
              <td colSpan={4} style={{padding:'11px 16px',fontSize:12,fontWeight:800,color:'#fff'}}>TOTAL ACTIVE PAYROLL</td>
              <td style={{padding:'11px 16px',fontSize:14,fontWeight:800,fontFamily:'monospace',textAlign:'right',color:'#F0C040'}}>{inr(totalPayroll)}</td>
              <td/>
            </tr>
          </tbody>
        </table>
      </div>
    )}

    {/* DOCUMENTS */}
    {tab==='documents'&&(
      <div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:18}}>
          {[
            {type:'salary',title:'Salary Slip',icon:'₹',desc:'Monthly salary slip with Basic, HRA, PF, ESIC, PT and Net Pay',color:'#14532D',bg:'#DCFCE7',bdr:'#86EFAC'},
            {type:'joining',title:'Joining / Appointment Letter',icon:'✉',desc:'Formal appointment letter with CTC, designation, and terms',color:'#1E3A8A',bg:'#DBEAFE',bdr:'#93C5FD'},
            {type:'warning',title:'Warning Letter',icon:'⚠',desc:'Written warning with reason, details and acknowledgement',color:'#7F1D1D',bg:'#FEE2E2',bdr:'#FCA5A5'},
          ].map(d=>(
            <div key={d.type} onClick={()=>{setDocType(d.type);setDocEmpId('');setWarnReason('');setWarnDetails('');setDocModal(true);}}
              style={{background:d.bg,border:`1px solid ${d.bdr}`,borderRadius:14,padding:'20px',cursor:'pointer',transition:'all .15s'}}>
              <div style={{fontSize:30,marginBottom:10}}>{d.icon}</div>
              <div style={{fontSize:15,fontWeight:800,color:d.color,marginBottom:6}}>{d.title}</div>
              <div style={{fontSize:12,color:d.color,opacity:.75,lineHeight:1.6}}>{d.desc}</div>
              <div style={{marginTop:12,fontSize:12,fontWeight:700,color:d.color,display:'flex',alignItems:'center',gap:4}}>Generate & Print PDF <ChevronRight size={12}/></div>
            </div>
          ))}
        </div>
        <div style={{background:'#EAF0F8',border:'1px solid #C5D5E8',borderRadius:10,padding:'12px 16px',fontSize:12.5,color:'#1E3A8A',lineHeight:1.7}}>
          <strong>How to save as PDF:</strong> Click Generate → new window opens → click "Print / Save PDF" → in print dialog, set printer to "Save as PDF" → click Save.
        </div>
      </div>
    )}

    {/* EMPLOYEE MODAL */}
    <Modal open={empModal} onClose={()=>setEmpModal(false)} title={editingId?'Edit Employee':'Add Employee'}
      footer={<><button onClick={()=>setEmpModal(false)} className="btn-secondary" style={{fontSize:13}}>Cancel</button><button onClick={saveEmp} className="btn-primary" style={{fontSize:13}}>Save</button></>}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:13}}>
        <F label="Full Name" required span={2}><input style={inp} value={form.name} onChange={set('name')} placeholder="Full name"/></F>
        <F label="Designation" required><input style={inp} value={form.designation} onChange={set('designation')} placeholder="e.g. Site Engineer"/></F>
        <F label="Department"><select style={sel} value={form.department} onChange={set('department')}>{DEPTS.map(d=><option key={d}>{d}</option>)}</select></F>
        <F label="Phone"><input style={inp} value={form.phone} onChange={set('phone')} placeholder="10-digit mobile"/></F>
        <F label="Email"><input style={inp} value={form.email} onChange={set('email')} placeholder="email@example.com"/></F>
        <F label="PAN Card"><input style={inp} value={form.pan} onChange={set('pan')} placeholder="ABCDE1234F"/></F>
        <F label="Date of Joining"><input style={inp} type="date" value={form.doj} onChange={set('doj')}/></F>
        <F label="Monthly Salary (₹)"><input style={inp} type="number" value={form.monthly_salary} onChange={set('monthly_salary')} placeholder="0"/></F>
        <F label="Status"><select style={sel} value={form.status} onChange={set('status')}><option>Active</option><option>Inactive</option><option>Contract</option></select></F>
      </div>
    </Modal>

    {/* DOCUMENT MODAL */}
    <Modal open={docModal} onClose={()=>setDocModal(false)}
      title={docType==='salary'?'Generate Salary Slip':docType==='joining'?'Generate Joining Letter':'Generate Warning Letter'}
      footer={<><button onClick={()=>setDocModal(false)} className="btn-secondary" style={{fontSize:13}}>Cancel</button><button onClick={generateDoc} className="btn-primary" style={{fontSize:13,display:'flex',alignItems:'center',gap:7}}><FileText size={13}/> Generate & Print PDF</button></>}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:13}}>
        <F label="Employee" required span={2}>
          <select style={sel} value={docEmpId} onChange={e=>setDocEmpId(e.target.value)}>
            <option value="">— Select employee —</option>
            {(employees||[]).map(e=><option key={e.id} value={e.id}>{e.name} ({e.designation})</option>)}
          </select>
        </F>
        {docType==='salary'&&(<>
          <F label="Month"><select style={sel} value={salMonth} onChange={e=>setSalMonth(e.target.value)}>{MONTHS_LIST.map((m,i)=><option key={m} value={i}>{m}</option>)}</select></F>
          <F label="Year"><select style={sel} value={salYear} onChange={e=>setSalYear(e.target.value)}>{['2024','2025','2026','2027'].map(y=><option key={y}>{y}</option>)}</select></F>
          {docEmpId&&(()=>{const s=getSummary(Number(docEmpId));const pd=s.p+(s.h*.5)||0;return(
            <div style={{gridColumn:'1/-1',background:'#F0FDF4',border:'1px solid #86EFAC',borderRadius:9,padding:'10px 13px',fontSize:12}}>
              <strong style={{color:'#14532D'}}>Attendance for {MONTHS_LIST[Number(salMonth)]} {salYear}:</strong>{' '}
              {s.p}P · {s.h}H · {s.a}A · {s.l}L
              {pd===0&&<span style={{color:'#D97706'}}> — No records yet, will use 26 days default</span>}
            </div>
          );})()} 
        </>)}
        {docType==='warning'&&(<>
          <F label="Reason for Warning" required span={2}>
            <select style={sel} value={warnReason} onChange={e=>setWarnReason(e.target.value)}>
              <option value="">— Select reason —</option>
              {['Absenteeism / Unauthorized Absence','Insubordination','Late Attendance','Misconduct','Poor Performance','Breach of Company Policy','Other'].map(r=><option key={r}>{r}</option>)}
            </select>
          </F>
          <F label="Details / Incident Description" required span={2}>
            <textarea style={{...inp,height:90,resize:'vertical'}} value={warnDetails} onChange={e=>setWarnDetails(e.target.value)} placeholder="Describe the specific incident, dates, and any prior verbal warnings given…"/>
          </F>
        </>)}
      </div>
    </Modal>
  </div>);
}
