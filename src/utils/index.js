import { format, parseISO, differenceInDays } from 'date-fns';

// ── CURRENCY ──────────────────────────────────────────────────────────────
export function inr(amount, compact = false) {
  const n = Number(amount) || 0;
  if (compact) {
    if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
    if (n >= 100000)   return '₹' + (n / 100000).toFixed(2) + ' L';
    if (n >= 1000)     return '₹' + (n / 1000).toFixed(1) + 'K';
  }
  return '₹' + n.toLocaleString('en-IN');
}

// ── DATES ─────────────────────────────────────────────────────────────────
export function fmtDate(d) {
  if (!d) return '—';
  try { return format(typeof d === 'string' ? parseISO(d) : d, 'dd MMM yyyy'); }
  catch { return d; }
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function currentFY() {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  const start = m >= 3 ? y : y - 1;
  return `${String(start).slice(2)}-${String(start + 1).slice(2)}`;
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  return differenceInDays(parseISO(dateStr), new Date());
}

// ── NUMBERS IN WORDS ──────────────────────────────────────────────────────
const ONES = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
              'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
              'Seventeen','Eighteen','Nineteen'];
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

export function numWords(n) {
  n = Math.round(n);
  if (n === 0) return 'Zero';
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n/10)] + (n%10 ? ' ' + ONES[n%10] : '');
  if (n < 1000) return ONES[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + numWords(n%100) : '');
  if (n < 100000) return numWords(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + numWords(n%1000) : '');
  if (n < 10000000) return numWords(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + numWords(n%100000) : '');
  return numWords(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' ' + numWords(n%10000000) : '');
}

// ── STATUS COLOURS ────────────────────────────────────────────────────────
export const UNIT_STATUS_COLORS = {
  Available:        { bg: '#E8F5EE', text: '#15622E', dot: '#15A34A' },
  Blocked:          { bg: '#F3F4F6', text: '#4B5563', dot: '#9CA3AF' },
  Booked:           { bg: '#EEF4FF', text: '#1D4ED8', dot: '#3B82F6' },
  'Agreement Done': { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  Registered:       { bg: '#EDE9FE', text: '#5B21B6', dot: '#8B5CF6' },
  'Possession Given':{ bg:'#E1F5EE', text:'#0F6E56', dot: '#0D9488' },
  Cancelled:        { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
};

export function unitStatusBadge(status) {
  const c = UNIT_STATUS_COLORS[status] || { bg: '#F3F4F6', text: '#4B5563' };
  return { background: c.bg, color: c.text };
}

// ── GST LOGIC ─────────────────────────────────────────────────────────────
export function suggestGSTRate(carpetAreaSqFt, agreementValue) {
  const carpetSqM = carpetAreaSqFt / 10.764;
  return (carpetSqM <= 60 && agreementValue <= 4500000) ? 1 : 5;
}

export function computeGST(compositePrice, gstRate) {
  // Composite: price includes GST. Extract base and GST.
  const base = Math.round(compositePrice * 100 / (100 + gstRate));
  const gst = compositePrice - base;
  return { base, gst, total: compositePrice };
}

// ── RERA ALERT ────────────────────────────────────────────────────────────
export function reraAlertLevel(expiryDate) {
  if (!expiryDate) return null;
  const days = daysUntil(expiryDate);
  if (days < 0)  return { level: 'expired', label: 'EXPIRED', color: 'red' };
  if (days <= 30)  return { level: 'critical', label: `${days}d left`, color: 'red' };
  if (days <= 90)  return { level: 'warning', label: `${days}d left`, color: 'amber' };
  return null;
}

// ── MISC ──────────────────────────────────────────────────────────────────
export function clx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function percent(num, den) {
  if (!den || den === 0) return 0;
  return Math.round((num / den) * 100);
}
