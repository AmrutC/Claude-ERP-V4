import React, { useEffect, useState } from 'react';
import { useAppStore } from './stores/appStore';
import Login from './components/Login';
import Shell from './components/Shell';
import Setup from './components/Setup';

export default function App() {
  const {
    user, activeEntity, oneDrivePath, setOneDrivePath,
    loadGlobal, loadFromFile, dataLoaded,
  } = useAppStore();
  const [checking, setChecking] = useState(true);

  // ── Step 1: On app open — get sync folder, then load global config ──────
  useEffect(() => {
    async function init() {
      if (window.vgERP) {
        try {
          const p = await window.vgERP.getSyncFolder();
          if (p) {
            setOneDrivePath(p);
            // Load entities + users immediately — before login screen shows
            await loadGlobal();
          }
        } catch (e) {
          console.error('[App] init error:', e);
        }
      }
      setChecking(false);
    }
    init();
  }, []);

  // ── Step 2: After login + entity selected — load entity data ────────────
  useEffect(() => {
    if (user && activeEntity?.code) {
      loadFromFile(activeEntity.code);
    }
  }, [user?.id, activeEntity?.code]);

  // ── Loading screen ───────────────────────────────────────────────────────
  if (checking) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0D1E35' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ color:'#F0C040', fontSize:22, fontWeight:800, marginBottom:8 }}>Vision Grroup ERP</div>
        <div style={{ color:'rgba(255,255,255,0.4)', fontSize:13 }}>Starting up…</div>
      </div>
    </div>
  );

  // ── First-time setup — no sync folder chosen yet ─────────────────────────
  if (!oneDrivePath) return <Setup />;

  // ── Login screen ─────────────────────────────────────────────────────────
  if (!user) return <Login />;

  // ── Loading entity data after login ──────────────────────────────────────
  if (!dataLoaded) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F9FAFB' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:36, height:36, border:'4px solid #E5E7EB', borderTopColor:'#C9951E', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ color:'#0D1E35', fontWeight:700, fontSize:14 }}>
          Loading {activeEntity?.code} data…
        </div>
        <div style={{ color:'#9CA3AF', fontSize:11, marginTop:4 }}>
          Reading vg_data_{activeEntity?.code}.json
        </div>
      </div>
    </div>
  );

  return <Shell />;
}
