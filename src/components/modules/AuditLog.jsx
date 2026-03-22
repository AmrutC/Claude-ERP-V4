import React, { useState } from 'react';
import Badge from '../ui/Badge';
import { fmtDate } from '../../utils';
import { Search, Download, Shield } from 'lucide-react';

const DEMO_LOG = [];
const EVENT_COLORS = {
  LOGIN:    { bg:'#DBEAFE', text:'#1E3A8A' },
  CREATE:   { bg:'#DCFCE7', text:'#14532D' },
  UPDATE:   { bg:'#FEF3C7', text:'#78350F' },
  DELETE:   { bg:'#FEE2E2', text:'#7F1D1D' },
  DOCUMENT: { bg:'#EDE9FE', text:'#4C1D95' },
  EXPORT:   { bg:'#CCFBF1', text:'#134E4A' },
  SETTINGS: { bg:'#F3F4F6', text:'#374151' },
  LOGOUT:   { bg:'#F3F4F6', text:'#374151' },
};

const MODULES = ['All','auth','bookings','payments','projects','documents','vendors','accounts','hr','settings','crm','gst'];
const EVENTS  = ['All','LOGIN','LOGOUT','CREATE','UPDATE','DELETE','DOCUMENT','EXPORT','SETTINGS'];
const inp = { width:'100%', border:'1px solid #D1D5DB', borderRadius:8, padding:'7px 10px', fontSize:13, color:'#111827', background:'#fff', outline:'none', fontFamily:'Inter,system-ui,sans-serif' };
const sel = { ...inp, cursor:'pointer' };

export default function AuditLog() {
  const [log] = useState([]);
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('All');
  const [filterEvent,  setFilterEvent]  = useState('All');
  const [filterUser,   setFilterUser]   = useState('All');

  const users = ['All', ...new Set(log.map(l=>l.user))];

  const filtered = log.filter(l =>
    (filterModule==='All' || l.module===filterModule) &&
    (filterEvent==='All'  || l.event===filterEvent) &&
    (filterUser==='All'   || l.user===filterUser) &&
    (!search || l.ref?.toLowerCase().includes(search.toLowerCase()) || l.new?.toLowerCase().includes(search.toLowerCase()) || l.user.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      {/* Immutable notice */}
      <div style={{background:'#EDE9FE',border:'1px solid #C4B5FD',borderRadius:10,padding:'10px 14px',marginBottom:16,display:'flex',gap:8,alignItems:'center'}}>
        <Shield size={14} style={{color:'#4C1D95',flexShrink:0}}/>
        <span style={{fontSize:12,color:'#4C1D95',fontWeight:500}}>
          <strong>Immutable Log</strong> — No entry can be edited or deleted. Every action by every user is recorded permanently.
        </span>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
        {[
          {l:'Total Events',v:log.length,c:'#0D1E35'},
          {l:'Logins',v:log.filter(l=>l.event==='LOGIN').length,c:'#1E3A8A'},
          {l:'Creates',v:log.filter(l=>l.event==='CREATE').length,c:'#14532D'},
          {l:'Documents',v:log.filter(l=>l.event==='DOCUMENT').length,c:'#4C1D95'},
        ].map(s=>(
          <div key={s.l} style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:12,padding:'11px 14px'}}>
            <div style={{fontSize:9.5,fontWeight:700,color:'#4B5563',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:3}}>{s.l}</div>
            <div style={{fontSize:18,fontWeight:800,color:s.c,fontFamily:'monospace'}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:200,position:'relative'}}>
          <Search size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#9CA3AF'}}/>
          <input style={{...inp,paddingLeft:32}} placeholder="Search records, users, references…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select style={{...sel,width:140}} value={filterModule} onChange={e=>setFilterModule(e.target.value)}>
          {MODULES.map(m=><option key={m} value={m}>{m==='All'?'All Modules':m}</option>)}
        </select>
        <select style={{...sel,width:130}} value={filterEvent} onChange={e=>setFilterEvent(e.target.value)}>
          {EVENTS.map(e=><option key={e} value={e}>{e==='All'?'All Events':e}</option>)}
        </select>
        <select style={{...sel,width:120}} value={filterUser} onChange={e=>setFilterUser(e.target.value)}>
          {users.map(u=><option key={u} value={u}>{u==='All'?'All Users':u}</option>)}
        </select>
        <button style={{background:'#F3F4F6',border:'1px solid #E5E7EB',borderRadius:8,padding:'7px 14px',cursor:'pointer',fontSize:12,fontWeight:600,color:'#374151',display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
          <Download size={12}/> Export CSV
        </button>
      </div>

      {/* Table */}
      <div style={{background:'#fff',border:'1px solid #E5E7EB',borderRadius:14,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
        <div style={{padding:'10px 16px',borderBottom:'1px solid #F3F4F6',fontSize:12,color:'#4B5563',fontWeight:600}}>
          Showing {filtered.length} of {log.length} events
        </div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#F9FAFB',borderBottom:'2px solid #E5E7EB'}}>
            {['Timestamp','User','Module','Event','Record / Reference','Change Detail'].map(h=>(
              <th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:'#4B5563',textTransform:'uppercase',letterSpacing:'0.5px',whiteSpace:'nowrap'}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.length===0?(
              <tr><td colSpan={6} style={{textAlign:'center',padding:40,color:'#9CA3AF',fontSize:13}}>No audit entries match your filters.</td></tr>
            ):filtered.map((l,i)=>{
              const ec = EVENT_COLORS[l.event]||{bg:'#F3F4F6',text:'#374151'};
              return(
                <tr key={l.id} style={{borderBottom:'1px solid #F3F4F6',background:i%2===0?'#fff':'#FAFAFA'}}>
                  <td style={{padding:'9px 14px',fontSize:11.5,color:'#374151',whiteSpace:'nowrap',fontFamily:'monospace'}}>
                    {new Date(l.timestamp).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',second:'2-digit'})}
                  </td>
                  <td style={{padding:'9px 14px',fontSize:12.5,fontWeight:700,color:'#0D1E35'}}>{l.user}</td>
                  <td style={{padding:'9px 14px',fontSize:12,color:'#374151',textTransform:'capitalize'}}>{l.module}</td>
                  <td style={{padding:'9px 14px'}}>
                    <span style={{background:ec.bg,color:ec.text,fontSize:10.5,fontWeight:700,padding:'2px 8px',borderRadius:12}}>{l.event}</span>
                  </td>
                  <td style={{padding:'9px 14px',fontSize:12.5,fontWeight:600,color:'#0D1E35',fontFamily:l.ref?.includes('/')?'monospace':'inherit'}}>{l.ref||'—'}</td>
                  <td style={{padding:'9px 14px'}}>
                    {l.field ? (
                      <div style={{fontSize:11.5,color:'#374151'}}>
                        <span style={{fontWeight:600}}>{l.field}:</span>{' '}
                        {l.old&&<span style={{textDecoration:'line-through',color:'#EF4444',marginRight:4}}>{l.old}</span>}
                        {l.new&&<span style={{color:'#15803D',fontWeight:600}}>{l.new}</span>}
                      </div>
                    ) : (
                      <span style={{fontSize:12,color:'#4B5563'}}>{l.new||'—'}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
