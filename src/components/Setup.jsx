import React, { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { FolderOpen, CheckCircle2 } from 'lucide-react';

export default function Setup() {
  const { setOneDrivePath, loadGlobal } = useAppStore();
  const [status, setStatus] = useState('idle');

  async function selectFolder() {
    setStatus('selecting');
    const result = await window.vgERP.setSyncFolder();
    if (result.ok) {
      setOneDrivePath(result.path);
      // Load any existing entities/users from vg_global.json in this folder
      await loadGlobal();
      setStatus('done');
    } else {
      setStatus('idle');
    }
  }

  return (
    <div className="h-screen bg-navy flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gold/10 rounded-2xl mb-4">
            <img src="/assets/icon.png" alt="VG" className="w-10 h-10 object-contain" onError={e=>e.target.style.display='none'}/>
          </div>
          <h1 className="text-2xl font-bold text-navy">Vision Grroup ERP</h1>
          <p className="text-sm text-gray-500 mt-1">First-time Setup</p>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-800 mb-1">Select your OneDrive ERP folder</h3>
          <p className="text-xs text-blue-600 leading-relaxed">
            All ERP data, documents, and backups will be stored here. 
            This folder should be inside your OneDrive Business folder so it syncs across all team members automatically.
          </p>
          <p className="text-xs text-blue-500 mt-2 font-mono">
            Suggested: OneDrive\Vision Grroup ERP\
          </p>
        </div>

        {status === 'done' ? (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
            <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
            <div className="text-sm text-green-800">
              Folder configured. Subfolders created. Redirecting…
            </div>
          </div>
        ) : (
          <button onClick={selectFolder} disabled={status === 'selecting'}
            className="w-full bg-navy text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 hover:bg-navy-dark transition-colors disabled:opacity-60">
            <FolderOpen size={17} />
            {status === 'selecting' ? 'Selecting…' : 'Choose OneDrive Folder'}
          </button>
        )}

        <p className="text-xs text-gray-400 text-center mt-4">
          This only needs to be done once per PC. Other team members select the same shared OneDrive folder.
        </p>
      </div>
    </div>
  );
}
