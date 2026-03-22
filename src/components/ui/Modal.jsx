import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clx } from '../../utils';

export default function Modal({ open, onClose, title, children, width = 'max-w-xl', footer }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose?.(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}/>
      <div className={clx('relative bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh]', width)}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-[15px] font-bold text-navy">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X size={15}/>
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {/* Footer */}
        {footer && <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2 flex-shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
