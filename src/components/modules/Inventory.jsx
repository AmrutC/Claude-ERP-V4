import React, { useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { UNIT_STATUS_COLORS } from '../../utils';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { Grid, List, Lock, ChevronRight } from 'lucide-react';

// Landowner — grey locked style
const LANDOWNER_COLOR = { bg:'#F1F5F9', text:'#64748B', dot:'#94A3B8' };

// Status display config (includes Landowner)
function getStatusColor(unit) {
  if (unit.is_landowner) return LANDOWNER_COLOR;
  return UNIT_STATUS_COLORS[unit.status] || { bg:'#F3F4F6', text:'#4B5563', dot:'#9CA3AF' };
}

const STATUS_ORDER = ['Available','Booked','Agreement Done','Registered','Possession Given','Landowner','Cancelled'];

// Build unit list from a project's unit_rows + live bookings
function buildUnitsFromProject(project, bookings) {
  if (!project) return [];

  const rows = project.unit_rows || [];

  return rows.map(u => {
    // Landowner units are always locked — never check booking
    if (u.is_landowner) {
      return {
        ...u,
        status:       'Landowner',
        booking_id:   null,
        allottee_name:null,
        booking_no:   null,
      };
    }

    // Find if this unit has an active booking
    const booking = (bookings||[]).find(b =>
      b.project_id === project.id &&
      b.unit_no    === u.unit_no &&
      b.status     !== 'Cancelled'
    );

    let status = 'Available';
    if (booking) {
      if      (booking.status === 'Agreement Done')                                                          status = 'Agreement Done';
      else if (booking.status === 'Registered')                                                              status = 'Registered';
      else if (booking.status === 'Possession Given')                                                        status = 'Possession Given';
      else if (['Booked','Approved'].includes(booking.status) || booking.approval_status === 'Approved')    status = 'Booked';
      else if (booking.approval_status === 'Pending' || booking.status === 'Pending Approval')               status = 'Booked';
    }

    return {
      ...u,
      status,
      booking_id:    booking?.id   || null,
      allottee_name: booking?.allottees?.[0]?.name || null,
      booking_no:    booking?.booking_no || null,
    };
  });
}

export default function Inventory() {
  const { user, activeEntity, projects, bookings, setActiveModule, setPendingBookingUnit } = useAppStore();

  const entityProjects = (projects||[]).filter(p => p.entity_id === activeEntity?.id);

  const [selProjectId, setSelProjectId] = useState(entityProjects[0]?.id || null);
  const [view, setView]                 = useState('grid');
  const [filterType, setFilterType]     = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch]             = useState('');
  const [selected, setSelected]         = useState(null);

  const selProject = entityProjects.find(p => p.id === Number(selProjectId));
  const allUnits   = buildUnitsFromProject(selProject, bookings);

  const unitTypes = ['All', ...new Set(allUnits.map(u => u.unit_type).filter(Boolean))];

  const filtered = allUnits.filter(u =>
    (filterType   === 'All' || u.unit_type === filterType) &&
    (filterStatus === 'All' || u.status    === filterStatus) &&
    (!search || (u.unit_no||'').toLowerCase().includes(search.toLowerCase()) ||
                (u.allottee_name||'').toLowerCase().includes(search.toLowerCase()) ||
                (u.landowner_name||'').toLowerCase().includes(search.toLowerCase()))
  );

  // Group by floor for grid view
  const floorMap = {};
  filtered.forEach(u => {
    const key = u.floor_no !== undefined ? u.floor_no : (u.floor || 1);
    if (!floorMap[key]) floorMap[key] = [];
    floorMap[key].push(u);
  });
  const floorsSorted = Object.keys(floorMap).map(Number).sort((a,b) => b - a);

  // Summary counts
  const counts = {};
  allUnits.forEach(u => { counts[u.status] = (counts[u.status]||0) + 1; });
  const availableCount  = counts['Available']  || 0;
  const landownerCount  = counts['Landowner']  || 0;
  const bookedCount     = (counts['Booked']||0) + (counts['Agreement Done']||0) + (counts['Registered']||0);

  function handleBook(unit) {
    if (unit.is_landowner || unit.status === 'Landowner') return;
    if (unit.status !== 'Available') return;
    setPendingBookingUnit({
      project_id:      selProject?.id,
      project_name:    selProject?.name,
      project_code:    selProject?.code,
      unit_no:         unit.unit_no,
      unit_type:       unit.unit_type,
      carpet_area:     unit.carpet_area,
      balcony_area:    unit.balcony_area,
      buildup_area:    unit.buildup_area,
      base_rate:       unit.base_rate,
      agreement_value: unit.carpet_area && unit.base_rate
                         ? Number(unit.carpet_area) * Number(unit.base_rate)
                         : 0,
      gst_rate:        unit.gst_rate || 5,
    });
    setActiveModule('bookings');
  }

  const floorLabel = (floorNo) => {
    if (floorNo === 0) return 'Ground Floor';
    const u = allUnits.find(u => (u.floor_no ?? u.floor) === floorNo);
    return u?.floor_label || `Floor ${floorNo}`;
  };

  return (
    <div>
      {/* Project selector */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex items-center gap-4 flex-wrap shadow-sm">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Project</span>
        <select
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-navy bg-white outline-none cursor-pointer min-w-[260px]"
          value={selProjectId || ''}
          onChange={e => { setSelProjectId(Number(e.target.value)); setSelected(null); }}>
          <option value="">— Select project —</option>
          {entityProjects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
        </select>

        {selProject && (
          <div className="flex gap-3 ml-2 flex-wrap">
            {[
              ['Available',    availableCount, '#15A34A', '#E8F5EE'],
              ['Booked',       bookedCount,    '#3B82F6', '#EEF4FF'],
              ['Landowner',    landownerCount, '#94A3B8', '#F1F5F9'],
            ].filter(([,cnt]) => cnt > 0).map(([label, cnt, tc, bg]) => (
              <span key={label} style={{ background:bg, color:tc }}
                className="text-xs font-bold px-2.5 py-1 rounded-full">
                {cnt} {label}
              </span>
            ))}
          </div>
        )}
      </div>

      {!selProject ? (
        <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
          <div className="text-4xl mb-3">🏢</div>
          <div className="text-sm font-semibold text-gray-500">Select a project to view inventory</div>
          {entityProjects.length === 0 &&
            <div className="text-xs text-gray-400 mt-2">No projects registered. Go to Projects tab to register one.</div>}
        </div>
      ) : (
        <div>
          {/* JV landowner notice */}
          {selProject.is_jv && landownerCount > 0 && (
            <div className="flex items-center gap-2 bg-slate-100 border border-slate-300 rounded-lg px-4 py-2.5 mb-4 text-sm text-slate-600 font-medium">
              <Lock size={14} className="flex-shrink-0"/>
              <span>
                This is a Joint Venture project. <strong>{landownerCount} landowner unit{landownerCount>1?'s':''}</strong> are locked and cannot be booked. They are shown in grey.
              </span>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <input
                className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none"
                placeholder="Search unit, allottee, owner…"
                value={search} onChange={e => setSearch(e.target.value)}/>
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </div>
            <select className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none bg-white cursor-pointer"
              value={filterType} onChange={e => setFilterType(e.target.value)}>
              {unitTypes.map(t => <option key={t}>{t}</option>)}
            </select>
            <select className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none bg-white cursor-pointer"
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              {['All', ...STATUS_ORDER].map(s => <option key={s}>{s}</option>)}
            </select>
            <div className="flex bg-gray-100 rounded-lg overflow-hidden">
              {[['grid','Grid'],['list','List']].map(([v,l]) => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${view===v?'bg-navy text-white':'text-gray-500 hover:bg-gray-200'}`}>{l}</button>
              ))}
            </div>
          </div>

          {/* ── GRID VIEW ─────────────────────────────────────────── */}
          {view === 'grid' && (
            <div className="space-y-3">
              {floorsSorted.map(floorNo => (
                <div key={floorNo} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10.5px] font-bold text-gray-500 uppercase tracking-wide flex items-center justify-between">
                    <span>{floorLabel(floorNo)}</span>
                    <span className="text-gray-400 font-normal">{floorMap[floorNo].length} unit{floorMap[floorNo].length!==1?'s':''}</span>
                  </div>
                  <div className="p-3 flex flex-wrap gap-2">
                    {floorMap[floorNo].map(u => {
                      const sc      = getStatusColor(u);
                      const isLO    = u.is_landowner || u.status === 'Landowner';
                      const isAvail = u.status === 'Available';
                      return (
                        <button key={u._key||u.unit_no}
                          onClick={() => setSelected(u)}
                          disabled={false}
                          title={isLO ? `Landowner — ${u.landowner_name||'Reserved'} (cannot book)` : (u.allottee_name || u.status)}
                          style={{
                            background:   sc.bg,
                            borderColor:  isLO ? '#CBD5E1' : sc.dot + '50',
                            color:        sc.text,
                            opacity:      isLO ? 0.75 : 1,
                            cursor:       'pointer',
                          }}
                          className="relative w-[90px] h-[58px] rounded-lg border-2 text-[9.5px] font-semibold flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-105 hover:shadow-sm">

                          {/* Lock icon overlay for landowner */}
                          {isLO && (
                            <div className="absolute top-1 right-1">
                              <Lock size={9} style={{ color: '#94A3B8' }}/>
                            </div>
                          )}

                          <span className="text-[11px] font-bold">{u.unit_no}</span>
                          <span className="opacity-80 font-normal">{u.unit_type}</span>
                          {isLO
                            ? <span className="text-[8.5px] font-bold opacity-70">LANDOWNER</span>
                            : u.allottee_name
                              ? <span className="text-[8px] opacity-70 max-w-[80px] truncate">{u.allottee_name}</span>
                              : null
                          }
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-sm text-gray-400">No units match filters.</div>
              )}
            </div>
          )}

          {/* ── LIST VIEW ─────────────────────────────────────────── */}
          {view === 'list' && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-gray-50 border-b-2 border-gray-100">
                  <tr>
                    {['Unit No.','Floor','Type','Carpet (sqft)','Balcony (sqft)','Built-up (sqft)','Status','Allottee / Owner',''].map(h => (
                      <th key={h} className="py-2.5 px-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, i) => {
                    const isLO = u.is_landowner || u.status === 'Landowner';
                    return (
                      <tr key={u._key||u.unit_no}
                        onClick={() => setSelected(u)}
                        className={`border-b border-gray-50 cursor-pointer transition-colors ${isLO ? 'bg-slate-50 hover:bg-slate-100' : i%2===0 ? 'hover:bg-blue-50/30' : 'bg-gray-50/30 hover:bg-blue-50/30'}`}>
                        <td className={`py-2.5 px-3 font-bold text-sm ${isLO ? 'text-gray-400' : 'text-navy'}`}>
                          <div className="flex items-center gap-1.5">
                            {isLO && <Lock size={11} className="text-gray-400 flex-shrink-0"/>}
                            {u.unit_no}
                          </div>
                        </td>
                        <td className={`py-2.5 px-3 text-xs ${isLO?'text-gray-400':'text-gray-600'}`}>{floorLabel(u.floor_no ?? u.floor)}</td>
                        <td className={`py-2.5 px-3 text-xs ${isLO?'text-gray-400':'text-gray-600'}`}>{u.unit_type}</td>
                        <td className={`py-2.5 px-3 text-xs font-mono text-right ${isLO?'text-gray-400':'text-gray-600'}`}>{u.carpet_area||'—'}</td>
                        <td className={`py-2.5 px-3 text-xs font-mono text-right ${isLO?'text-gray-400':'text-gray-600'}`}>{u.balcony_area||'—'}</td>
                        <td className={`py-2.5 px-3 text-xs font-mono text-right ${isLO?'text-gray-400':'text-gray-600'}`}>{u.buildup_area||'—'}</td>
                        <td className="py-2.5 px-3">
                          {isLO ? (
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                              <Lock size={8}/> Landowner
                            </span>
                          ) : (
                            <Badge value={u.status}/>
                          )}
                        </td>
                        <td className={`py-2.5 px-3 text-xs ${isLO?'text-gray-400 italic':'text-gray-600'}`}>
                          {isLO ? (u.landowner_name || 'Landowner Reserved') : (u.allottee_name || '—')}
                        </td>
                        <td className="py-2.5 px-3">
                          {!isLO && <ChevronRight size={13} className="text-gray-300"/>}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="py-12 text-center text-sm text-gray-400">No units match filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4">
            {[
              ['Available', UNIT_STATUS_COLORS['Available'].dot],
              ['Booked', UNIT_STATUS_COLORS['Booked'].dot],
              ['Agreement Done', UNIT_STATUS_COLORS['Agreement Done'].dot],
              ['Registered', UNIT_STATUS_COLORS['Registered'].dot],
              ['Landowner (Locked)', LANDOWNER_COLOR.dot],
            ].map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                {label.includes('Locked')
                  ? <Lock size={10} style={{ color }}/>
                  : <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }}/>
                }
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── UNIT DETAIL MODAL ─────────────────────────────────────── */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)}
          title={`Unit ${selected.unit_no}`}
          footer={
            <div className="flex gap-2 justify-end w-full">
              <button onClick={() => setSelected(null)} className="btn-secondary text-xs">Close</button>
              {!selected.is_landowner && selected.status !== 'Landowner' && selected.status === 'Available' && (
                <button onClick={() => { setSelected(null); handleBook(selected); }}
                  className="btn-primary text-xs flex items-center gap-1.5">
                  Book This Unit <ChevronRight size={12}/>
                </button>
              )}
              {!selected.is_landowner && selected.status !== 'Landowner' && selected.status !== 'Available' && (
                <button onClick={() => { setSelected(null); setActiveModule('bookings'); }}
                  className="btn-secondary text-xs">
                  View Booking
                </button>
              )}
              {(selected.is_landowner || selected.status === 'Landowner') && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                  <Lock size={11}/> Landowner unit — cannot be booked
                </div>
              )}
            </div>
          }>

          <div className="space-y-4">
            {/* Landowner notice at top of modal */}
            {(selected.is_landowner || selected.status === 'Landowner') && (
              <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <Lock size={16} className="text-slate-400 mt-0.5 flex-shrink-0"/>
                <div>
                  <div className="text-sm font-bold text-slate-600">Landowner Unit — Locked</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    This unit is reserved for the landowner under the Joint Venture agreement.
                    It cannot be booked or sold.
                  </div>
                  {selected.landowner_name && (
                    <div className="text-xs font-semibold text-slate-600 mt-1.5">
                      Landowner: {selected.landowner_name}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Unit details grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Unit No.',       selected.unit_no],
                ['Type',           selected.unit_type],
                ['Floor',          floorLabel(selected.floor_no ?? selected.floor)],
                ['Carpet Area',    selected.carpet_area ? `${selected.carpet_area} sqft` : '—'],
                ['Balcony Area',   selected.balcony_area ? `${selected.balcony_area} sqft` : '—'],
                ['Built-up Area',  selected.buildup_area ? `${selected.buildup_area} sqft` : '—'],
                ['GST Rate',       `${selected.gst_rate || 5}%`],
                ['Status',         selected.status],
              ].map(([l,v]) => (
                <div key={l} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{l}</div>
                  <div className={`text-sm font-semibold ${l==='Status' && (selected.is_landowner||selected.status==='Landowner') ? 'text-slate-500' : 'text-navy'}`}>{v}</div>
                </div>
              ))}
            </div>

            {/* Allottee info for booked units */}
            {!selected.is_landowner && selected.allottee_name && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <div className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide mb-1">Allottee</div>
                <div className="text-sm font-bold text-navy">{selected.allottee_name}</div>
                {selected.booking_no && (
                  <div className="text-xs font-mono text-blue-600 mt-0.5">{selected.booking_no}</div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
