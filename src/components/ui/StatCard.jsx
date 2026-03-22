import React from 'react';

const COLOR_MAP = {
  navy:   { value: '#0D1E35', bg: '#EAF0F8', border: '#C5D5E8' },
  green:  { value: '#14532D', bg: '#DCFCE7', border: '#86EFAC' },
  red:    { value: '#7F1D1D', bg: '#FEE2E2', border: '#FCA5A5' },
  amber:  { value: '#78350F', bg: '#FEF3C7', border: '#FCD34D' },
  blue:   { value: '#1E3A8A', bg: '#DBEAFE', border: '#93C5FD' },
  purple: { value: '#4C1D95', bg: '#EDE9FE', border: '#C4B5FD' },
  teal:   { value: '#134E4A', bg: '#CCFBF1', border: '#5EEAD4' },
  gray:   { value: '#374151', bg: '#F3F4F6', border: '#D1D5DB' },
  gold:   { value: '#78350F', bg: '#FEF3C7', border: '#FCD34D' },
};

export default function StatCard({ label, value, sub, color = 'navy', icon: Icon }) {
  const c = COLOR_MAP[color] || COLOR_MAP.navy;

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E5E7EB',
      borderRadius: 12,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          // Dark enough to read on white background
          color: '#4B5563',
        }}>
          {label}
        </span>
        {Icon && (
          <div style={{
            width: 26, height: 26,
            borderRadius: 7,
            background: c.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={13} style={{ color: c.value }} />
          </div>
        )}
      </div>

      {/* Value — large, bold, high contrast */}
      <div style={{
        fontSize: 19,
        fontWeight: 800,
        fontFamily: "'JetBrains Mono', Consolas, monospace",
        color: c.value,
        lineHeight: 1.2,
        letterSpacing: '-0.5px',
      }}>
        {value}
      </div>

      {/* Sub label */}
      {sub && (
        <div style={{
          fontSize: 11,
          color: '#6B7280',  // readable gray, not too light
          marginTop: 1,
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}
