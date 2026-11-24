// Mattoncini grafici del pannello amministratore
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const cx = (...c) => c.filter(Boolean).join(' ');

export const inputBase = 'px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
export const inputCls = `w-full ${inputBase}`;

export function Btn({ variant = 'primary', size = 'md', className, ...p }) {
  const v = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    dark: 'bg-slate-900 hover:bg-slate-800 text-white',
    ghost: 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white',
    warn: 'bg-amber-500 hover:bg-amber-600 text-white',
    ok: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  }[variant];
  const s = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm';
  return <button type="button" className={cx('inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed', v, s, className)} {...p} />;
}

export function Card({ title, actions, children, className }) {
  return (
    <section className={cx('bg-white rounded-xl border border-slate-200 shadow-sm', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-100">
          {title && <h2 className="font-bold text-slate-900">{title}</h2>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-slate-700 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-500 mt-1">{hint}</span>}
    </label>
  );
}

const BADGE = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  red: 'bg-rose-50 text-rose-700 border-rose-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
};
export function Badge({ color = 'slate', children }) {
  return <span className={cx('inline-flex items-center px-1.5 py-0.5 rounded border text-[11px] font-semibold whitespace-nowrap', BADGE[color])}>{children}</span>;
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-start sm:items-center justify-center p-3 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cx('bg-white rounded-2xl shadow-2xl w-full my-6', wide ? 'max-w-3xl' : 'max-w-lg')}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Stat({ label, value, sub, color = 'text-slate-900' }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={cx('text-2xl font-extrabold mt-1 tabular-nums', color)}>{value ?? '–'}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export function Empty({ children }) {
  return <p className="text-sm text-slate-500 text-center py-8">{children}</p>;
}

export const fmtDate = (d) => (d ? new Date(d).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '–');
export const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '–');

// Ricerca semplice su più campi
export const matches = (q, ...fields) => {
  const s = q.trim().toLowerCase();
  return !s || fields.some((f) => String(f ?? '').toLowerCase().includes(s));
};
