import React from 'react';

// Every badge: dark text on tinted background — readable on both white cards and gray backgrounds
const STYLES = {
  // Unit status
  'Available':          { bg: '#DCFCE7', text: '#14532D', border: '#86EFAC' },
  'Blocked':            { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' },
  'Booked':             { bg: '#DBEAFE', text: '#1E3A8A', border: '#93C5FD' },
  'Agreement Done':     { bg: '#FEF3C7', text: '#78350F', border: '#FCD34D' },
  'Registered':         { bg: '#EDE9FE', text: '#4C1D95', border: '#C4B5FD' },
  'Possession Given':   { bg: '#CCFBF1', text: '#134E4A', border: '#5EEAD4' },
  'Cancelled':          { bg: '#FEE2E2', text: '#7F1D1D', border: '#FCA5A5' },

  // Payment / milestone
  'Paid':               { bg: '#DCFCE7', text: '#14532D', border: '#86EFAC' },
  'Part Paid':          { bg: '#DBEAFE', text: '#1E3A8A', border: '#93C5FD' },
  'Pending':            { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' },
  'Overdue':            { bg: '#FEE2E2', text: '#7F1D1D', border: '#FCA5A5' },
  'Demand Issued':      { bg: '#FEF3C7', text: '#78350F', border: '#FCD34D' },
  'Unpaid':             { bg: '#FEE2E2', text: '#7F1D1D', border: '#FCA5A5' },

  // Project status
  'Under Construction': { bg: '#FEF3C7', text: '#78350F', border: '#FCD34D' },
  'Planning':           { bg: '#DBEAFE', text: '#1E3A8A', border: '#93C5FD' },
  'Completed':          { bg: '#DCFCE7', text: '#14532D', border: '#86EFAC' },
  'On Hold':            { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' },

  // People / accounts
  'Active':             { bg: '#DCFCE7', text: '#14532D', border: '#86EFAC' },
  'Inactive':           { bg: '#FEE2E2', text: '#7F1D1D', border: '#FCA5A5' },
  'Contract':           { bg: '#EDE9FE', text: '#4C1D95', border: '#C4B5FD' },

  // RERA
  'Yes':                { bg: '#DCFCE7', text: '#14532D', border: '#86EFAC' },
  'No':                 { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' },
  'Exempt':             { bg: '#FEF3C7', text: '#78350F', border: '#FCD34D' },

  // KYC
  'Received':           { bg: '#DCFCE7', text: '#14532D', border: '#86EFAC' },
  'Verified':           { bg: '#EDE9FE', text: '#4C1D95', border: '#C4B5FD' },

  // Bank transactions
  'Receipt':            { bg: '#DCFCE7', text: '#14532D', border: '#86EFAC' },
  'Payment':            { bg: '#FEE2E2', text: '#7F1D1D', border: '#FCA5A5' },

  // Lead status
  'New':                { bg: '#DBEAFE', text: '#1E3A8A', border: '#93C5FD' },
  'Contacted':          { bg: '#FEF3C7', text: '#78350F', border: '#FCD34D' },
  'Converted':          { bg: '#DCFCE7', text: '#14532D', border: '#86EFAC' },
  'Lost':               { bg: '#FEE2E2', text: '#7F1D1D', border: '#FCA5A5' },
  'Negotiation':        { bg: '#EDE9FE', text: '#4C1D95', border: '#C4B5FD' },
  'Site Visit Done':    { bg: '#CCFBF1', text: '#134E4A', border: '#5EEAD4' },

  // Credit / Debit
  'Credit':             { bg: '#DCFCE7', text: '#14532D', border: '#86EFAC' },
  'Debit':              { bg: '#FEE2E2', text: '#7F1D1D', border: '#FCA5A5' },

  // Brokerage
  'Partially Paid':     { bg: '#DBEAFE', text: '#1E3A8A', border: '#93C5FD' },

  // Approvals
  'Applied':            { bg: '#FEF3C7', text: '#78350F', border: '#FCD34D' },
  'Expired':            { bg: '#FEE2E2', text: '#7F1D1D', border: '#FCA5A5' },
};

const FALLBACK = { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' };

export default function Badge({ value, size = 'sm' }) {
  const s = STYLES[value] || FALLBACK;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
        borderRadius: 20,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        fontSize: size === 'sm' ? 11 : 12,
        padding: size === 'sm' ? '2px 8px' : '3px 10px',
        lineHeight: 1.4,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {value}
    </span>
  );
}
