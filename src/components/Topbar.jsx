import React from 'react';
import { useAppStore } from '../stores/appStore';
import { Database, Bell, ChevronRight } from 'lucide-react';

export default function Topbar({ title }) {
  const { activeEntity, oneDrivePath } = useAppStore();

  return (
    <header style={{
      background: '#FFFFFF',
      borderBottom: '1px solid #E5E7EB',
      padding: '12px 22px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      <div>
        {/* Main title — dark navy, bold, fully readable */}
        <h1 style={{
          fontSize: 17,
          fontWeight: 800,
          color: '#0D1E35',
          lineHeight: 1.2,
          margin: 0,
        }}>
          {title}
        </h1>

        {/* Entity sub-label — darker than before */}
        {activeEntity && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginTop: 3,
          }}>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#FFFFFF',
              background: '#0D1E35',
              padding: '1px 6px',
              borderRadius: 4,
              lineHeight: 1.5,
            }}>
              {activeEntity.code}
            </span>
            <span style={{
              fontSize: 11.5,
              color: '#374151',  // dark gray — readable on white
              fontWeight: 500,
            }}>
              {activeEntity.name}
            </span>
          </div>
        )}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* OneDrive sync indicator */}
        {oneDrivePath ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: '#DCFCE7',
            border: '1px solid #86EFAC',
            borderRadius: 8,
            padding: '4px 10px',
          }}>
            <Database size={11} style={{ color: '#14532D' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#14532D' }}>
              OneDrive synced
            </span>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: '#FEF3C7',
            border: '1px solid #FCD34D',
            borderRadius: 8,
            padding: '4px 10px',
          }}>
            <Database size={11} style={{ color: '#78350F' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#78350F' }}>
              Local only
            </span>
          </div>
        )}

        {/* Bell icon */}
        <button style={{
          width: 34, height: 34,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 9,
          background: 'transparent',
          border: '1px solid #E5E7EB',
          cursor: 'pointer',
          transition: 'background 0.12s',
          color: '#374151',
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <Bell size={15} />
        </button>
      </div>
    </header>
  );
}
