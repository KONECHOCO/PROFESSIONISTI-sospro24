import React, { useState, useSyncExternalStore } from 'react';
import { Settings, Crown, Moon, Lock, Gift, UserX, ShieldCheck } from 'lucide-react';
import { Modal, ModalHeader } from './ui';
import { useMonetization, hasPremium, showAdPrivacyOptions } from '../services/monetization';
import { APP_VERSION, showReferralField, setReferralCode, subscribeReferral, getReferralState } from '../services/referral';
import { fmt } from '../lib/utils';

export default function SettingsModal({ t, dark, onToggleDark, blockedCount, onUnblockAll, onOpenPremium, onClose }) {
  const mon = useMonetization();
  const premium = hasPremium(mon);
  // Si aggiorna quando il codice invito viene accettato
  useSyncExternalStore(subscribeReferral, getReferralState);

  return (
    <Modal onClose={onClose} title={t.settingsTitle} maxWidth="max-w-md">
      <ModalHeader onClose={onClose} closeLabel={t.closeLabel} title={t.settingsTitle} icon={<Settings className="w-5 h-5 text-blue-600" />} />
      <div className="p-5 sm:p-6 space-y-4">
        {mon.native && (
          <button
            type="button"
            onClick={onOpenPremium}
            className="w-full p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-left"
          >
            <Crown className="w-6 h-6 text-amber-500 shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-extrabold text-slate-900">{t.premiumName}</span>
              <span className="block text-xs text-slate-600">{mon.isPro ? t.premiumOwned : t.premiumSubtitle}</span>
            </span>
          </button>
        )}

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
          <span className="flex items-start gap-3 min-w-0">
            <Moon className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            <span>
              <span className="block text-sm font-bold text-slate-800">{t.darkTheme}</span>
              <span className="block text-xs text-slate-500">{t.darkThemeDesc}</span>
            </span>
          </span>
          {premium ? (
            <button
              type="button"
              role="switch"
              aria-checked={dark}
              aria-label={t.darkTheme}
              onClick={onToggleDark}
              className={`w-12 h-7 rounded-full shrink-0 relative transition ${dark ? 'bg-blue-600' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${dark ? 'left-6' : 'left-1'}`} />
            </button>
          ) : (
            <button type="button" onClick={onOpenPremium} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-400 text-slate-950 text-[11px] font-extrabold shrink-0">
              <Lock className="w-3 h-3" /> {t.premiumBtn}
            </button>
          )}
        </div>

        {mon.native && mon.privacyOptions && !mon.isPro && (
          <button type="button" onClick={showAdPrivacyOptions} className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3 text-left text-sm font-bold text-slate-800">
            <ShieldCheck className="w-5 h-5 text-slate-500" />
            {t.adPrivacyOptions}
          </button>
        )}

        {showReferralField() && <ReferralField t={t} />}

        {blockedCount > 0 && (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <span className="flex items-center gap-3 text-sm font-semibold text-slate-700">
              <UserX className="w-5 h-5 text-slate-500" />
              {fmt(t.blockedCount, { n: blockedCount })}
            </span>
            <button type="button" onClick={onUnblockAll} className="text-xs font-bold text-blue-600 hover:underline shrink-0">{t.unblockAll}</button>
          </div>
        )}

        <p className="text-[11px] text-slate-500 text-center">SOSPro24 · {t.appVersion} {APP_VERSION}</p>
      </div>
    </Modal>
  );
}

/* Codice invito degli ambasciatori: solo nell'app, nei primi 7 giorni */
function ReferralField({ t }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const errors = { invalid: t.refInvalid, network: t.refNetwork, expired: t.refExpired };

  const apply = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    const res = await setReferralCode(code);
    setBusy(false);
    setMsg(res === 'ok' ? { ok: true, text: `${t.refApplied} ${getReferralState().code}` } : { ok: false, text: errors[res] || t.refInvalid });
  };

  return (
    <form onSubmit={apply} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
      <label htmlFor="ref-code" className="flex items-center gap-2 text-sm font-bold text-slate-800">
        <Gift className="w-5 h-5 text-blue-600" /> {t.refQuestion}
      </label>
      <p className="text-xs text-slate-500">{t.refHint}</p>
      <div className="flex gap-2">
        <input
          id="ref-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t.refPlaceholder}
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={20}
          className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" disabled={busy || !code.trim()} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50">
          {t.refApply}
        </button>
      </div>
      {msg && <p className={`text-xs font-semibold ${msg.ok ? 'text-emerald-700' : 'text-rose-700'}`} role="status">{msg.text}</p>}
    </form>
  );
}
