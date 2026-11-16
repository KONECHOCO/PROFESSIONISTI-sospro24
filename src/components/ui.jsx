import React, { useEffect, useRef } from 'react';
import { X, Star, CheckCircle2, AlertTriangle } from 'lucide-react';

/* ---------- Avatar con iniziali (nessuna foto di persone reali, nessuna dipendenza esterna) ---------- */
const AVATAR_COLORS = ['bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-rose-600', 'bg-amber-600', 'bg-cyan-700', 'bg-slate-700'];

export function Avatar({ name = '?', size = 'w-14 h-14', text = 'text-lg' }) {
  const initials = name
    .replace(/\(.*?\)/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  const hash = [...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return (
    <div
      aria-hidden="true"
      className={`${size} ${text} ${AVATAR_COLORS[hash % AVATAR_COLORS.length]} rounded-2xl text-white font-extrabold flex items-center justify-center shrink-0`}
    >
      {initials || '?'}
    </div>
  );
}

/* ---------- Stelle ---------- */
export function Stars({ value, size = 'w-3.5 h-3.5' }) {
  return (
    <span className="inline-flex items-center" role="img" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${size} ${i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
      ))}
    </span>
  );
}

/* ---------- Modale accessibile: Esc, click sullo sfondo, blocco scroll, focus ---------- */
const modalStack = [];

export function Modal({ onClose, title, children, maxWidth = 'max-w-2xl', z = 'z-50' }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const token = {};
    modalStack.push(token);
    const previouslyFocused = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();

    const onKey = (e) => {
      // Solo la modale in cima allo stack reagisce a Esc
      if (e.key === 'Escape' && modalStack[modalStack.length - 1] === token) closeRef.current?.();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      modalStack.splice(modalStack.indexOf(token), 1);
      if (!modalStack.length) document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 ${z} bg-slate-950/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`bg-white rounded-3xl ${maxWidth} w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 outline-none`}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ title, onClose, closeLabel = 'Close', icon, tone = 'text-slate-900' }) {
  return (
    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
      <h3 className={`text-base sm:text-lg font-extrabold flex items-center gap-2 ${tone}`}>
        {icon}
        {title}
      </h3>
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        title={closeLabel}
        className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

/* ---------- Toast (feedback visibile a TUTTI gli utenti, anche non registrati) ---------- */
export function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(onDismiss, 5000);
    return () => clearTimeout(id);
  }, [toast, onDismiss]);

  if (!toast) return null;
  const isError = toast.type === 'error';
  const Icon = isError ? AlertTriangle : CheckCircle2;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] max-w-[92vw] sm:max-w-md px-4 py-3 rounded-2xl shadow-2xl text-sm font-semibold flex items-start gap-2.5 ${
        isError ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'
      }`}
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <span>{toast.message}</span>
    </div>
  );
}
