import React from 'react';
import { clx } from '../../utils';

export default function FormField({ label, required, children, hint, error, cols = 1 }) {
  return (
    <div className={cols > 1 ? `col-span-${cols}` : ''}>
      {label && (
        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-[10.5px] text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-[10.5px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export function FormGrid({ cols = 2, children }) {
  return (
    <div className={`grid gap-4 ${cols === 1 ? '' : cols === 2 ? 'grid-cols-2' : cols === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
      {children}
    </div>
  );
}

export function FormSection({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-bold text-navy uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">{title}</h3>
      {children}
    </div>
  );
}
