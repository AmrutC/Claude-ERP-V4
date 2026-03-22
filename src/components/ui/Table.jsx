import React from 'react';
import { clx } from '../../utils';

export function Table({ children, className }) {
  return (
    <div className={clx('border border-gray-100 rounded-xl overflow-hidden overflow-x-auto', className)}>
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }) {
  return <thead className="bg-gray-50 border-b border-gray-100">{children}</thead>;
}

export function TBody({ children }) {
  return <tbody>{children}</tbody>;
}

export function Th({ children, right, className }) {
  return (
    <th className={clx('py-2.5 px-4 text-left text-[10.5px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap', right && 'text-right', className)}>
      {children}
    </th>
  );
}

export function Tr({ children, onClick, selected, className }) {
  return (
    <tr onClick={onClick}
      className={clx('border-b border-gray-50 last:border-0 transition-colors',
        onClick && 'cursor-pointer hover:bg-blue-50/40',
        selected && 'bg-blue-50',
        className)}>
      {children}
    </tr>
  );
}

export function Td({ children, bold, mono, right, muted, className }) {
  return (
    <td className={clx('py-2.5 px-4',
      bold  && 'font-semibold text-navy',
      mono  && 'font-mono text-right',
      right && 'text-right',
      muted && 'text-gray-400',
      !bold && !muted && 'text-gray-700',
      className)}>
      {children}
    </td>
  );
}

export function EmptyRow({ cols, message = 'No records found.' }) {
  return (
    <Tr><td colSpan={cols} className="text-center py-10 text-gray-400 text-sm italic">{message}</td></Tr>
  );
}
