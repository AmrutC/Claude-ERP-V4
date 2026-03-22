import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { clx } from '../../utils';

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const STYLES = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error:   'bg-red-50 border-red-200 text-red-800',
  info:    'bg-blue-50 border-blue-200 text-blue-800',
};

export default function Toast({ toasts = [] }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-50">
      {toasts.map(t => {
        const Icon = ICONS[t.type] || CheckCircle2;
        return (
          <div key={t.id} className={clx('flex items-center gap-2.5 border rounded-xl px-4 py-3 shadow-lg text-sm font-medium min-w-64 max-w-sm', STYLES[t.type] || STYLES.success)}>
            <Icon size={15} className="flex-shrink-0"/>
            <span className="flex-1">{t.msg}</span>
          </div>
        );
      })}
    </div>
  );
}
