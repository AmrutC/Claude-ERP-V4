import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { fmtDate } from '../../utils';
import { Plus, Search, Phone, Mail, MessageSquare, Download, Calendar, CheckCircle2, ArrowRight, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const SOURCES  = ['Walk-in','Referral','Broker','Portal','Social Media','Exhibition','Hoarding','Other'];
const TYPES    = ['1RK','1BHK','2BHK','3BHK','Shop','Office','Any'];
const STATUSES = ['New','Contacted','Site Visit Done','Negotiation','Converted','Lost'];
const LOST_REASONS   = ['Budget constraint','Location issue','Project delayed','Competitor','Not interested','No response','Other'];
const FOLLOWUP_TYPES = ['Call','WhatsApp','Site Visit','Email','Meeting','Other'];
const OUTCOMES       = ['Interested','Not Interested','Callback Requested','Visit Scheduled','Need Time','No Response'];
const SALES_PERSONS  = ['Director','Accounts Manager','Sales Executive 1','Sales Executive 2'];
const BROKERS        = ['Rajesh Real Estate','Mehta Property Dealers','Direct / No Broker'];

const SOURCE_COLORS = { 'Walk-in':'#15803D','Referral':'#1D4ED8','Broker':'#7C3AED','Portal':'#D97706','Social Media':'#0F766E','Exhibition':'#DC2626','Hoarding':'#6B7280','Other':'#374151' };
const STATUS_BG     = { New:'#DBEAFE',Contacted:'#FEF3C7','Site Visit Done':'#CCFBF1',Negotiation:'#EDE9FE',Converted:'#DCFCE7',Lost:'#FEE2E2' };
const STATUS_TEXT   = { New:'#1E3A8A',Contacted:'#78350F','Site Visit Done':'#134E4A',Negotiation:'#4C1D95',Converted:'#14532D',Lost:'#7F1D1D' };
const FU_COLORS     = { Call:{bg:'#DBEAFE',text:'#1E3A8A'},WhatsApp:{bg:'#DCFCE7',text:'#14532D'},'Site Visit':{bg:'#CCFBF1',text:'#134E4A'},Email:{bg:'#EDE9FE',text:'#4C1D95'},Meeting:{bg:'#FEF3C7',text:'#78350F'},Other:{bg:'#F3F4F6',text:'#374151'} };

function validateForm(f) {
  const e = {};
  if (!f.name.trim()) e.name = 'Name is required.';
  if (!f.phone.trim()) e.phone = 'Mobile number is required.';
  else if (!/^[6-9]\d{9}$/.test(f.phone.trim())) e.phone = 'Enter valid 10-digit Indian mobile (starts with 6-9).';
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter valid email (name@domain.com).';
  if (f.source === 'Referral' && !f.referral_name.trim()) e.referral_name = 'Reference person name is mandatory for Referral leads.';
  if (f.budget_min && f.budget_max && Number(f.budget_max) < Number(f.budget_min)) e.budget_max = 'Max budget must be ≥ min budget.';
  return e;
}

const DEMO_LEADS = [];
let leadCtr = 5, fuCtr = 10;
const EMPTY = { name:'',phone:'',email:'',source:'Walk-in',broker:'',referral_name:'',assigned_to:'Sales Executive 1',interested_in:'2BHK',budget_min:'',budget_max:'',status:'New',enquiry_date:new Date().toISOString().slice(0,10),site_visit_date:'',site_visit_notes:'',next_followup:'',notes:'',lost_reason:'',followups:[] };
const EMPTY_FU = { date:new Date().toISOString().slice(0,10),type:'Call',notes:'',outcome:'Interested',next_date:'' };

const inp    = { width:'100%',border:'1px solid #D1D5DB',borderRadius:8,padding:'7px 10px',fontSize:13,color:'#111827',background:'#fff',outline:'none',fontFamily:'Inter,system-ui,sans-serif' };
const inpE   = { ...inp, border:'1px solid #EF4444', background:'#FFF5F5' };
const selSty = { ...inp, cursor:'pointer' };

function exportCSV(leads) {
  const hdr = ['Name','Phone','Email','Source','Referral By','Broker','Assigned To','Interested In','Budget Min','Budget Max','Status','Enquiry Date','Site Visit Date','Next Follow-up','Lost Reason','Notes'];
  const rows = leads.map(l=>[`"${l.name}"`,l.phone,l.email||'',l.source,l.referral_name||'',l.broker||'',l.assigned_to,l.interested_in,l.budget_min||'',l.budget_max||'',l.status,l.enquiry_date,l.site_visit_date||'',l.next_followup||'',l.lost_reason||'',`"${(l.notes||'').replace(/"/g,"'")}"`]);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([[hdr,...rows].map(r=>r.join(',')).join('\n')],{type:'text/csv'}));
  a.download = `CRM_Leads_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

const F = ({label,required,error,children,span})=>(
  <div style={{gridColumn:span?`span ${span}`:undefined}}>
    <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4B5563',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:5}}>
      {label}{required&&<span style={{color:'#DC2626',marginLeft:2}}>*</span>}
    </label>
    {children}
    {error&&<div style={{fontSize:11,color:'#DC2626',marginTop:3}}>{error}</div>}
  </div>
);

export default function CRM() {
  const { addToast } = useAppStore();
  const [leads,setLeads]             = useState([]);
  const [open,setOpen]               = useState(false);
  const [form,setForm]               = useState(EMPTY);
  const [errors,setErrors]           = useState({});
  const [editingId,setEditingId]     = useState(null);
  const [selLead,setSelLead]         = useState(DEMO_LEADS[0]);
  const [search,setSearch]           = useState('');
  const [filterStatus,setFilterStatus] = useState('All');
  const [filterAssigned,setFilterAssigned] = useState('All');
  const [detailTab,setDetailTab]     = useState('overview');
  const [fuModal,setFuModal]         = useState(false);
  const [fuForm,setFuForm]           = useState(EMPTY_FU);
  const [convertModal,setConvertModal] = useState(false);

  const today = new Date().toISOString().slice(0,10);
  const set = k => e => { setForm(f=>({...f,[k]:e.target.value})); setErrors(er=>({...er,[k]:''})); };

  const counts   = STATUSES.reduce((a,s)=>({...a,[s]:leads.filter(l=>l.status===s).length}),{});
  const ovdCount = leads.filter(l=>l.next_followup&&l.next_followup<today&&!['Converted','Lost'].includes(l.status)).length;
  const srcData  = SOURCES.map(s=>({source:s,count:leads.filter(l=>l.source===s).length,color:SOURCE_COLORS[s]})).filter(s=>s.count>0);

  const filtered = leads.filter(l=>
    (filterStatus==='All'||l.status===filterStatus)&&
    (filterAssigned==='All'||l.assigned_to===filterAssigned)&&
    (!search||l.name.toLowerCase().includes(search.toLowerCase())||l.phone.includes(search)||l.email?.toLowerCase().includes(search.toLowerCase()))
  );

  function save() {
    const errs = validateForm(form);
    if (Object.keys(errs).length>0) { setErrors(errs); return; }
    if (editingId) {
      setLeads(ls=>ls.map(l=>l.id===editingId?{...l,...form,budget_min:Number(form.budget_min)||0,budget_max:Number(form.budget_max)||0}:l));
      if (selLead?.id===editingId) setSelLead(l=>({...l,...form}));
      addToast('Lead updated.','success');
    } else {
      leadCtr++;
      const nl={...form,id:leadCtr,budget_min:Number(form.budget_min)||0,budget_max:Number(form.budget_max)||0,followups:[]};
      setLeads(ls=>[nl,...ls]);
      setSelLead(nl);
      addToast('Lead added.','success');
    }
    setOpen(false); setErrors({});
  }
  function openNew() { setForm({...EMPTY,enquiry_date:today}); setEditingId(null); setErrors({}); setOpen(true); }
  function openEdit(l) { setForm({...l}); setEditingId(l.id); setErrors({}); setOpen(true); }
  function updateStatus(id,status) {
    setLeads(ls=>ls.map(l=>l.id===id?{...l,status}:l));
    if (selLead?.id===id) setSelLead(l=>({...l,status}));
    addToast(`Status → ${status}`,'success');
    if (status==='Converted') setConvertModal(true);
  }
  function addFollowup() {
    if (!fuForm.notes.trim()) { alert('Enter follow-up notes.'); return; }
    fuCtr++;
    const fu = {...fuForm,id:fuCtr};
    const upd = {...selLead,followups:[...(selLead.followups||[]),fu],next_followup:fuForm.next_date||selLead.next_followup};
    setLeads(ls=>ls.map(l=>l.id===upd.id?upd:l));
    setSelLead(upd);
    setFuModal(false); setFuForm(EMPTY_FU);
    addToast('Follow-up logged.','success');
  }

  return (
    <div>
      {/* TOP: funnel + chart */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:14,marginBottom:14}}>
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:7,marginBottom:8}}>
            {STATUSES.map(s=>(
              <div key={s} onClick={()=>setFilterStatus(filterStatus===s?'All':s)}
                style={{background:filterStatus===s?STATUS_BG[s]:'#fff',border:`1px solid ${filterStatus===s?STATUS_TEXT[s]+'50':'#E5E7EB'}`,borderRadius:10,padding:'10px 10px',cursor:'pointer',transition:'all .15s'}}>
                <div style={{fontSize:10,fontWeight:700,color:STATUS_TEXT[s],textTransform:'uppercase',letterSpacing:'0.4px',marginBottom:3}}>{s}</div>
                <div style={{fontSize:22,fontWeight:800,color:STATUS_TEXT[s]}}>{counts[s]||0}</div>
              </div>
            ))}
          </div>
          {ovdCount>0&&<div style={{background:'#FEF3C7',border:'1px solid #FCD34D',borderRadius:9,padding:'7px 14px',fontSize:12.5,fontWeight:600,color:'#78350F'}}>⚠ {ovdCount} follow-up{ovdCount>1?'s':''} overdue today</div>}
        </div>
        <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:12,padding:'14px 14px',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#4B5563',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:10}}>Leads by Source</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={srcData} barSize={16} layout="vertical">
              <XAxis type="number" tick={{fontSize:10,fill:'#9CA3AF'}} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="source" tick={{fontSize:10.5,fill:'#374151',fontWeight:600}} axisLine={false} tickLine={false} width={85}/>
              <Tooltip contentStyle={{fontSize:12,borderRadius:8,border:'1px solid #E5E7EB'}}/>
              <Bar dataKey="count" radius={[0,4,4,0]}>{srcData.map((s,i)=><Cell key={i} fill={s.color}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TOOLBAR */}
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:180,position:'relative'}}>
          <Search size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#9CA3AF'}}/>
          <input style={{...inp,paddingLeft:32}} placeholder="Search name, phone, email…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select style={{...selSty,width:160}} value={filterAssigned} onChange={e=>setFilterAssigned(e.target.value)}>
          <option value="All">All Staff</option>
          {SALES_PERSONS.map(s=><option key={s}>{s}</option>)}
        </select>
        <button onClick={()=>setFilterStatus('All')} style={{...selSty,width:'auto',padding:'7px 12px',fontSize:12.5,color:filterStatus==='All'?'#0D1E35':'#6B7280',fontWeight:filterStatus==='All'?700:400,cursor:'pointer'}}>All ({leads.length})</button>
        <button onClick={()=>exportCSV(filtered)} style={{display:'flex',alignItems:'center',gap:6,background:'#fff',border:'1px solid #E5E7EB',borderRadius:8,padding:'7px 12px',cursor:'pointer',fontSize:12.5,fontWeight:600,color:'#374151'}}>
          <Download size={13}/> Export
        </button>
        <button onClick={openNew} className="btn-primary" style={{fontSize:12.5}}><Plus size={13}/> Add Lead</button>
      </div>

      {/* MAIN SPLIT */}
      <div style={{display:'grid',gridTemplateColumns:'290px 1fr',gap:14}}>
        {/* Lead list */}
        <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:14,overflow:'hidden',maxHeight:'calc(100vh - 340px)',overflowY:'auto',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
          {filtered.length===0?<div style={{padding:40,textAlign:'center',color:'#9CA3AF',fontSize:13}}>No leads found.</div>:
          filtered.map(l=>{
            const ov=l.next_followup&&l.next_followup<today&&!['Converted','Lost'].includes(l.status);
            return(
              <div key={l.id} onClick={()=>{setSelLead(l);setDetailTab('overview');}}
                style={{padding:'11px 14px',borderBottom:'1px solid #F3F4F6',cursor:'pointer',background:selLead?.id===l.id?'#EFF6FF':'transparent',borderLeft:selLead?.id===l.id?'3px solid #0D1E35':'3px solid transparent'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#0D1E35'}}>{l.name}</div>
                  <span style={{background:STATUS_BG[l.status],color:STATUS_TEXT[l.status],fontSize:9.5,fontWeight:700,padding:'2px 6px',borderRadius:10,whiteSpace:'nowrap'}}>{l.status}</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6,marginTop:3}}>
                  <span style={{fontSize:12,color:'#374151'}}>{l.phone}</span>
                  <a href={`https://wa.me/91${l.phone}`} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}
                    style={{display:'inline-flex',alignItems:'center',background:'#DCFCE7',borderRadius:5,padding:'1px 5px',textDecoration:'none'}} title="WhatsApp">
                    <MessageSquare size={10} style={{color:'#15803D'}}/>
                  </a>
                </div>
                <div style={{display:'flex',gap:5,marginTop:4,fontSize:11,color:'#6B7280',flexWrap:'wrap'}}>
                  <span>{l.interested_in}</span><span>·</span><span>{l.source}</span>
                  {l.source==='Referral'&&l.referral_name&&<><span>·</span><span style={{color:'#1D4ED8'}}>Ref: {l.referral_name}</span></>}
                  <span>·</span><span style={{color:'#4B5563',fontWeight:600}}>{l.assigned_to?.replace('Sales Executive ','SE ')}</span>
                </div>
                {l.next_followup&&<div style={{marginTop:4,fontSize:11,fontWeight:600,color:ov?'#DC2626':'#6B7280'}}>{ov?'⚠ OVERDUE: ':'Follow-up: '}{fmtDate(l.next_followup)}</div>}
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {selLead?(
          <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:14,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
            {/* Header */}
            <div style={{padding:'14px 20px',borderBottom:'1px solid #F3F4F6',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:5}}>
                  <span style={{fontSize:17,fontWeight:800,color:'#0D1E35'}}>{selLead.name}</span>
                  <span style={{background:STATUS_BG[selLead.status],color:STATUS_TEXT[selLead.status],fontSize:11,fontWeight:700,padding:'2px 9px',borderRadius:12}}>{selLead.status}</span>
                </div>
                <div style={{display:'flex',gap:10,fontSize:12.5,color:'#374151',flexWrap:'wrap',alignItems:'center'}}>
                  <a href={`tel:${selLead.phone}`} style={{display:'flex',alignItems:'center',gap:4,color:'#374151',textDecoration:'none'}}><Phone size={12}/>{selLead.phone}</a>
                  <a href={`https://wa.me/91${selLead.phone}`} target="_blank" rel="noreferrer"
                    style={{display:'flex',alignItems:'center',gap:4,color:'#14532D',textDecoration:'none',background:'#DCFCE7',padding:'2px 8px',borderRadius:6,fontSize:11.5,fontWeight:600}}>
                    <MessageSquare size={11}/> WhatsApp
                  </a>
                  {selLead.email&&<a href={`mailto:${selLead.email}`} style={{display:'flex',alignItems:'center',gap:4,color:'#374151',textDecoration:'none'}}><Mail size={12}/>{selLead.email}</a>}
                </div>
              </div>
              <button onClick={()=>openEdit(selLead)} style={{background:'#F3F4F6',border:'1px solid #E5E7EB',borderRadius:8,padding:'6px 14px',cursor:'pointer',fontSize:12,fontWeight:600,color:'#374151'}}>Edit</button>
            </div>

            {/* Tabs */}
            <div style={{display:'flex',gap:2,padding:'8px 16px',borderBottom:'1px solid #F3F4F6',background:'#F9FAFB'}}>
              {[['overview','Overview'],['followups','Follow-ups ('+(selLead.followups||[]).length+')'],['sitevisit','Site Visit']].map(([id,label])=>(
                <button key={id} onClick={()=>setDetailTab(id)}
                  style={{padding:'5px 14px',borderRadius:7,fontSize:12,fontWeight:detailTab===id?700:500,color:detailTab===id?'#0D1E35':'#6B7280',background:detailTab===id?'#fff':'transparent',cursor:'pointer',border:detailTab===id?'1px solid #E5E7EB':'1px solid transparent',boxShadow:detailTab===id?'0 1px 2px rgba(0,0,0,0.06)':''}}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{padding:'16px 20px',overflowY:'auto',maxHeight:'calc(100vh - 460px)'}}>

              {/* OVERVIEW */}
              {detailTab==='overview'&&(
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
                    {[['Source',selLead.source],['Interested In',selLead.interested_in],
                      ['Budget',selLead.budget_min?`₹${(selLead.budget_min/100000).toFixed(0)}L – ₹${(selLead.budget_max/100000).toFixed(0)}L`:'Not specified'],
                      ['Assigned To',selLead.assigned_to||'—'],
                      ['Enquiry Date',fmtDate(selLead.enquiry_date)||'—'],
                      ['Next Follow-up',selLead.next_followup?fmtDate(selLead.next_followup):'—'],
                      selLead.source==='Referral'?['Referred By',selLead.referral_name||'—']:['Broker',selLead.broker||'—'],
                      selLead.status==='Lost'?['Lost Reason',selLead.lost_reason||'—']:['Follow-ups Done',String((selLead.followups||[]).length)],
                    ].map(([l,v])=>(
                      <div key={l} style={{background:'#F8FAFC',borderRadius:8,padding:'9px 12px'}}>
                        <div style={{fontSize:9.5,fontWeight:700,color:'#4B5563',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:2}}>{l}</div>
                        <div style={{fontSize:13,fontWeight:600,color:'#0D1E35'}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {selLead.notes&&<div style={{background:'#F8FAFC',borderRadius:9,padding:'10px 13px',marginBottom:14,fontSize:13,color:'#374151',lineHeight:1.6}}>{selLead.notes}</div>}
                  <div style={{borderTop:'1px solid #F3F4F6',paddingTop:14}}>
                    <div style={{fontSize:11,fontWeight:700,color:'#4B5563',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:10}}>Move to Stage</div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      {STATUSES.filter(s=>s!==selLead.status).map(s=>(
                        <button key={s} onClick={()=>updateStatus(selLead.id,s)}
                          style={{background:STATUS_BG[s],border:`1px solid ${STATUS_TEXT[s]}30`,borderRadius:7,padding:'5px 11px',cursor:'pointer',fontSize:12,fontWeight:600,color:STATUS_TEXT[s],display:'flex',alignItems:'center',gap:4}}>
                          <ArrowRight size={11}/> {s}
                        </button>
                      ))}
                    </div>
                    {selLead.status==='Converted'&&(
                      <button onClick={()=>setConvertModal(true)}
                        style={{marginTop:12,background:'#0D1E35',color:'#fff',border:'none',borderRadius:9,padding:'8px 20px',cursor:'pointer',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',gap:7}}>
                        <ChevronRight size={14}/> Convert to Booking
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* FOLLOW-UPS */}
              {detailTab==='followups'&&(
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                    <span style={{fontSize:12,fontWeight:700,color:'#0D1E35'}}>Follow-up History</span>
                    <button onClick={()=>{setFuForm({...EMPTY_FU,date:today});setFuModal(true);}} className="btn-primary" style={{fontSize:12}}>
                      <Plus size={12}/> Log Follow-up
                    </button>
                  </div>
                  {(selLead.followups||[]).length===0
                    ?<div style={{textAlign:'center',padding:28,color:'#9CA3AF',fontSize:13}}>No follow-ups logged yet.</div>
                    :[...(selLead.followups||[])].reverse().map((fu,i)=>{
                      const tc=FU_COLORS[fu.type]||{bg:'#F3F4F6',text:'#374151'};
                      return(
                        <div key={fu.id} style={{display:'flex',gap:10,padding:'11px 13px',background:'#F8FAFC',borderRadius:10,border:'1px solid #E5E7EB',marginBottom:8}}>
                          <div style={{width:3,background:tc.text,borderRadius:3,flexShrink:0}}/>
                          <div style={{flex:1}}>
                            <div style={{display:'flex',gap:7,alignItems:'center',marginBottom:5,flexWrap:'wrap'}}>
                              <span style={{background:tc.bg,color:tc.text,fontSize:10.5,fontWeight:700,padding:'2px 8px',borderRadius:10}}>{fu.type}</span>
                              <span style={{fontSize:12,color:'#374151',fontWeight:600}}>{fmtDate(fu.date)}</span>
                              {fu.outcome&&<span style={{fontSize:11,color:'#6B7280'}}>→ {fu.outcome}</span>}
                            </div>
                            <div style={{fontSize:13,color:'#111827',lineHeight:1.5}}>{fu.notes}</div>
                            {fu.next_date&&<div style={{marginTop:5,fontSize:11.5,color:'#1E3A8A',fontWeight:600}}>Next: {fmtDate(fu.next_date)}</div>}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* SITE VISIT */}
              {detailTab==='sitevisit'&&(
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:'#0D1E35',marginBottom:14}}>Site Visit Record</div>
                  {selLead.site_visit_date?(
                    <div style={{display:'flex',flexDirection:'column',gap:12}}>
                      <div style={{background:'#CCFBF1',border:'1px solid #5EEAD4',borderRadius:10,padding:'12px 16px',display:'flex',alignItems:'center',gap:10}}>
                        <CheckCircle2 size={16} style={{color:'#0F766E'}}/>
                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:'#0F766E'}}>Site Visit Completed</div>
                          <div style={{fontSize:12,color:'#134E4A',marginTop:2}}>{fmtDate(selLead.site_visit_date)}</div>
                        </div>
                      </div>
                      {selLead.site_visit_notes&&(
                        <div style={{background:'#F8FAFC',borderRadius:10,padding:'13px 15px',border:'1px solid #E5E7EB'}}>
                          <div style={{fontSize:11,fontWeight:700,color:'#4B5563',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:7}}>Visit Notes</div>
                          <div style={{fontSize:13,color:'#374151',lineHeight:1.7}}>{selLead.site_visit_notes}</div>
                        </div>
                      )}
                    </div>
                  ):(
                    <div style={{textAlign:'center',padding:32,color:'#9CA3AF',fontSize:13}}>
                      No site visit recorded yet.<br/>
                      <span style={{fontSize:12}}>Edit this lead to add site visit date and notes.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ):(
          <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',color:'#9CA3AF',fontSize:13}}>
            Select a lead to view details
          </div>
        )}
      </div>

      {/* ADD/EDIT MODAL */}
      <Modal open={open} onClose={()=>{setOpen(false);setErrors({});}} title={editingId?'Edit Lead':'Add New Lead'} width="max-w-3xl"
        footer={<><button onClick={()=>{setOpen(false);setErrors({});}} className="btn-secondary" style={{fontSize:13}}>Cancel</button><button onClick={save} className="btn-primary" style={{fontSize:13}}>Save Lead</button></>}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:13}}>
          <F label="Full Name" required error={errors.name}><input style={errors.name?inpE:inp} value={form.name} onChange={set('name')} placeholder="Lead's full name"/></F>
          <F label="Mobile Number" required error={errors.phone}>
            <div style={{display:'flex',gap:6}}>
              <input style={{...(errors.phone?inpE:inp),flex:1}} value={form.phone} onChange={set('phone')} placeholder="10-digit (e.g. 9876543210)" maxLength={10}/>
              {form.phone&&/^[6-9]\d{9}$/.test(form.phone)&&(
                <a href={`https://wa.me/91${form.phone}`} target="_blank" rel="noreferrer"
                  style={{display:'flex',alignItems:'center',gap:4,background:'#DCFCE7',border:'1px solid #86EFAC',borderRadius:8,padding:'0 10px',textDecoration:'none',fontSize:11.5,fontWeight:700,color:'#14532D',whiteSpace:'nowrap'}}>
                  <MessageSquare size={11}/> WA
                </a>
              )}
            </div>
          </F>
          <F label="Email Address" error={errors.email}><input style={errors.email?inpE:inp} value={form.email} onChange={set('email')} placeholder="name@domain.com (optional)"/></F>
          <F label="Enquiry / Walk-in Date"><input style={inp} type="date" value={form.enquiry_date} onChange={set('enquiry_date')}/></F>
          <F label="Lead Source" required>
            <select style={selSty} value={form.source} onChange={set('source')}>{SOURCES.map(s=><option key={s}>{s}</option>)}</select>
          </F>
          {form.source==='Referral'?(
            <F label="Referred By (Name)" required error={errors.referral_name}><input style={errors.referral_name?inpE:inp} value={form.referral_name} onChange={set('referral_name')} placeholder="Name of person who referred this lead"/></F>
          ):form.source==='Broker'?(
            <F label="Broker Name"><select style={selSty} value={form.broker} onChange={set('broker')}><option value="">Select broker…</option>{BROKERS.map(b=><option key={b}>{b}</option>)}</select></F>
          ):<div/>}
          <F label="Interested In"><select style={selSty} value={form.interested_in} onChange={set('interested_in')}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></F>
          <F label="Assigned To"><select style={selSty} value={form.assigned_to} onChange={set('assigned_to')}>{SALES_PERSONS.map(s=><option key={s}>{s}</option>)}</select></F>
          <F label="Budget Min (₹)"><input style={inp} type="number" value={form.budget_min} onChange={set('budget_min')} placeholder="0"/></F>
          <F label="Budget Max (₹)" error={errors.budget_max}><input style={errors.budget_max?inpE:inp} type="number" value={form.budget_max} onChange={set('budget_max')} placeholder="0"/></F>
          <F label="Status"><select style={selSty} value={form.status} onChange={set('status')}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></F>
          <F label="Next Follow-up Date"><input style={inp} type="date" value={form.next_followup} onChange={set('next_followup')}/></F>
          {form.status==='Lost'&&<F label="Lost Reason" span={2}><select style={selSty} value={form.lost_reason} onChange={set('lost_reason')}><option value="">Select reason…</option>{LOST_REASONS.map(r=><option key={r}>{r}</option>)}</select></F>}
          <F label="Site Visit Date"><input style={inp} type="date" value={form.site_visit_date} onChange={set('site_visit_date')}/></F>
          <div/>
          <F label="Site Visit Notes" span={2}><textarea style={{...inp,height:54,resize:'vertical'}} value={form.site_visit_notes} onChange={set('site_visit_notes')} placeholder="What was shown, feedback, preferences noted…"/></F>
          <F label="General Notes" span={2}><textarea style={{...inp,height:54,resize:'vertical'}} value={form.notes} onChange={set('notes')} placeholder="Any additional notes about this lead…"/></F>
        </div>
      </Modal>

      {/* LOG FOLLOW-UP MODAL */}
      <Modal open={fuModal} onClose={()=>setFuModal(false)} title={`Log Follow-up — ${selLead?.name}`}
        footer={<><button onClick={()=>setFuModal(false)} className="btn-secondary" style={{fontSize:13}}>Cancel</button><button onClick={addFollowup} className="btn-primary" style={{fontSize:13}}>Save Follow-up</button></>}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:13}}>
          <F label="Date"><input style={inp} type="date" value={fuForm.date} onChange={e=>setFuForm(f=>({...f,date:e.target.value}))}/></F>
          <F label="Type"><select style={selSty} value={fuForm.type} onChange={e=>setFuForm(f=>({...f,type:e.target.value}))}>{FOLLOWUP_TYPES.map(t=><option key={t}>{t}</option>)}</select></F>
          <F label="Outcome"><select style={selSty} value={fuForm.outcome} onChange={e=>setFuForm(f=>({...f,outcome:e.target.value}))}>{OUTCOMES.map(o=><option key={o}>{o}</option>)}</select></F>
          <F label="Next Follow-up Date"><input style={inp} type="date" value={fuForm.next_date} onChange={e=>setFuForm(f=>({...f,next_date:e.target.value}))}/></F>
          <F label="Notes / What was discussed" required span={2}>
            <textarea style={{...inp,height:80,resize:'vertical'}} value={fuForm.notes} onChange={e=>setFuForm(f=>({...f,notes:e.target.value}))} placeholder="What was discussed, response, commitments made…"/>
          </F>
        </div>
      </Modal>

      {/* CONVERT TO BOOKING MODAL */}
      <Modal open={convertModal} onClose={()=>setConvertModal(false)} title="Convert to Booking"
        footer={<><button onClick={()=>setConvertModal(false)} className="btn-secondary" style={{fontSize:13}}>Later</button><button onClick={()=>{addToast('Go to Bookings module to create the booking.','info');setConvertModal(false);}} className="btn-primary" style={{fontSize:13}}><ChevronRight size={13}/> Go to Bookings</button></>}>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{background:'#DCFCE7',border:'1px solid #86EFAC',borderRadius:10,padding:'13px 16px',display:'flex',gap:10,alignItems:'flex-start'}}>
            <CheckCircle2 size={17} style={{color:'#15803D',flexShrink:0,marginTop:1}}/>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:'#14532D',marginBottom:3}}>{selLead?.name} marked as Converted</div>
              <div style={{fontSize:12.5,color:'#166534'}}>Go to the <strong>Bookings</strong> module to create the formal booking, assign a flat, set the agreement value, and generate the booking acknowledgement (BKG document).</div>
            </div>
          </div>
          <div style={{background:'#EAF0F8',borderRadius:10,padding:'12px 14px',fontSize:12.5,color:'#0D1E35',lineHeight:1.8}}>
            <strong>Details to carry forward:</strong><br/>
            Name: {selLead?.name} &nbsp;·&nbsp; Phone: {selLead?.phone}<br/>
            Interested In: {selLead?.interested_in} &nbsp;·&nbsp; Source: {selLead?.source}<br/>
            {selLead?.source==='Referral'&&selLead?.referral_name&&<>Referred By: {selLead.referral_name}<br/></>}
            {selLead?.broker&&<>Broker: {selLead.broker}<br/></>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
