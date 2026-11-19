import React, { useState } from 'react';
import { Crown, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import { Modal, ModalHeader } from './ui';
import { useMonetization, buyPro, restorePro } from '../services/monetization';
import { fmt } from '../lib/utils';

/* ---------- Finestra Premium: vantaggi, acquisto una tantum, ripristino ---------- */
export function PremiumModal({ t, onClose }) {
  const { native, isPro, proPrice } = useMonetization();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const run = async (fn, okMsg, failMsg) => {
    setBusy(true);
    setMessage(null);
    try {
      const ok = await fn();
      setMessage(ok ? okMsg : failMsg);
    } catch (err) {
      console.warn('Premium purchase error', err);
      setMessage(t.premiumError);
    } finally {
      setBusy(false);
    }
  };

  const benefits = [t.premiumNoAds, t.premiumSavedSearches, t.premiumDark, t.premiumFavs, t.premiumQr, t.premiumSupport];

  return (
    <Modal onClose={onClose} title={t.premiumName} maxWidth="max-w-md" z="z-[60]">
      <ModalHeader onClose={onClose} closeLabel={t.closeLabel} title={t.premiumName} icon={<Crown className="w-5 h-5 text-amber-500" />} />
      <div className="p-5 sm:p-6 space-y-4">
        <p className="text-sm font-semibold text-slate-700">{t.premiumSubtitle}</p>
        <ul className="space-y-2">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              {b}
            </li>
          ))}
        </ul>

        {isPro ? (
          <p className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold text-center">{t.premiumOwned}</p>
        ) : !native ? (
          <p className="p-3 rounded-xl bg-slate-100 text-slate-700 text-xs text-center">{t.premiumWebOnly}</p>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => run(buyPro, t.premiumOwned, t.premiumError)}
              className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
              {/* Il prezzo vero (nella valuta dell'utente) arriva dallo store; questo è solo il ripiego */}
              {fmt(t.premiumBuy, { price: proPrice || t.premiumFallbackPrice })}
            </button>
            <p className="text-[11px] text-slate-500 text-center">{t.premiumOnce}</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(restorePro, t.premiumRestored, t.premiumNotFound)}
              className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t.premiumRestore}
            </button>
          </div>
        )}

        {message && <p className="text-xs text-center text-slate-600" role="status">{message}</p>}
      </div>
    </Modal>
  );
}

/* ---------- Spazio per il banner AdMob (disegnato dal codice nativo sopra la pagina) ---------- */
export function AdSpacer() {
  const { native, isPro, bannerHeight } = useMonetization();
  if (!native || isPro || !bannerHeight) return null;
  return <div style={{ height: bannerHeight }} aria-hidden="true" />;
}

/* ---------- Pannello diagnostico: solo con gli annunci di test attivi (7 tocchi sul logo) ---------- */
export function AdDiagnostics() {
  const { testAds, diag, native, adsReady, isPro } = useMonetization();
  const [open, setOpen] = useState(true);
  if (!testAds || !native) return null;
  return (
    <div className="fixed left-2 right-2 bottom-24 z-[80] rounded-xl bg-black/85 border border-amber-500/60 text-[10px] text-amber-100 font-mono shadow-2xl">
      <button type="button" onClick={() => setOpen(!open)} className="w-full text-left px-2 py-1 font-bold text-amber-300">
        ADS DEBUG · ready={String(adsReady)} pro={String(isPro)} {open ? '▼' : '▲'}
      </button>
      {open && (
        <div className="max-h-48 overflow-y-auto px-2 pb-2 space-y-0.5">
          {(diag || []).map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  );
}
