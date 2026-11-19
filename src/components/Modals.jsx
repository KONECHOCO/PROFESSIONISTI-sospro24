import React, { useMemo, useState } from 'react';
import { ShieldCheck, LogOut, Trash2 } from 'lucide-react';
import { Avatar, Modal, ModalHeader } from './ui';
import { COUNTRIES, CATEGORIES, LEGAL_SECTIONS } from '../data';
import { pick, isValidPhone, currencyOf, countryName } from '../lib/utils';
import { signIn, signUp, sendPasswordReset, updatePassword, authErrorKey } from '../lib/api';

const inputCls = 'w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelCls = 'block text-xs font-bold text-slate-700 mb-1';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

/* =============================== TERMINI =============================== */
export function TermsModal({ lang, t, onClose }) {
  return (
    <Modal onClose={onClose} title={t.termsTitle} z="z-[60]">
      <ModalHeader onClose={onClose} closeLabel={t.closeLabel} title={t.termsTitle} icon={<ShieldCheck className="w-5 h-5 text-blue-600" />} />
      <div className="p-5 sm:p-6 space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
        {(LEGAL_SECTIONS[lang] || LEGAL_SECTIONS.it).map((sec, i) => (
          <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <h4 className="font-bold text-slate-900 mb-1.5">{sec.title}</h4>
            <p>{sec.body}</p>
          </div>
        ))}
        <div className="pt-2 flex justify-end">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm">
            {t.closeBtn}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ============================ ACCESSO / REGISTRAZIONE ============================ */
// mode: 'login' | 'signup' | 'forgot'
export function AuthModal({ lang, t, defaultCountry, onClose, onShowTerms, onSignedIn }) {
  const [mode, setMode] = useState('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'client',
    country: defaultCountry && defaultCountry !== 'ALL' ? defaultCountry : 'IT',
    city: '',
    acceptedTerms: false,
  });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const switchMode = (m) => { setMode(m); setError(''); setInfo(''); };

  const run = async (fn) => {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      await fn();
    } catch (err) {
      setError(t[authErrorKey(err)] || t.authErrorGeneric);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (busy) return;

    if (mode === 'forgot') {
      return run(async () => {
        await sendPasswordReset(form.email);
        setInfo(t.resetSent);
      });
    }

    if (mode === 'login') {
      return run(async () => {
        await signIn(form);
        onSignedIn();
      });
    }

    // Registrazione
    if (!form.acceptedTerms || !form.name.trim()) return undefined;
    if (form.password.length < 8) return setError(t.authErrorWeak);
    return run(async () => {
      const data = await signUp({ ...form, lang });
      // Con la conferma email attiva, un'email già registrata torna senza "identities"
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setError(t.authErrorExists);
        return;
      }
      if (data.session) onSignedIn();
      else setInfo(t.checkEmail);
    });
  };

  const title = mode === 'signup' ? t.signupTab : mode === 'forgot' ? t.forgotPassword : t.loginTab;
  const submitLabel = mode === 'signup' ? t.registerSubmit : mode === 'forgot' ? t.sendResetLink : t.loginSubmit;

  return (
    <Modal onClose={onClose} title={title} maxWidth="max-w-md">
      <ModalHeader onClose={onClose} closeLabel={t.closeLabel} title={t.loginRegisterBtn} />
      <div className="p-5 sm:p-6">
        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 mb-4" role="tablist">
            {[['login', t.loginTab], ['signup', t.signupTab]].map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className={`py-2 rounded-lg text-sm font-bold transition ${mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {mode === 'signup' && <p className="text-xs text-slate-600 mb-4 leading-relaxed">{t.memberRequiredDesc}</p>}

        <form onSubmit={submit} className="space-y-3.5">
          {mode === 'signup' && (
            <>
              <div className="grid grid-cols-2 gap-2" role="radiogroup">
                {[['client', '👤', t.roleClient], ['pro', '🛠️', t.rolePro]].map(([role, icon, label]) => (
                  <button
                    key={role}
                    type="button"
                    role="radio"
                    aria-checked={form.role === role}
                    onClick={() => set({ role })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      form.role === role ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
              <Field label={`${t.fullName} *`}>
                <input type="text" required maxLength={80} autoComplete="name" value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder={t.fullNamePh} className={inputCls} />
              </Field>
            </>
          )}

          <Field label={`${t.email} *`}>
            <input type="email" required autoComplete="email" value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="nome@email.com" className={inputCls} />
          </Field>

          {mode !== 'forgot' && (
            <Field label={`${t.password} *`}>
              <input
                type="password"
                required
                minLength={mode === 'signup' ? 8 : undefined}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={form.password}
                onChange={(e) => set({ password: e.target.value })}
                placeholder={mode === 'signup' ? t.passwordPh : ''}
                className={inputCls}
              />
            </Field>
          )}

          {mode === 'login' && (
            <button type="button" onClick={() => switchMode('forgot')} className="text-xs font-semibold text-blue-600 hover:underline">
              {t.forgotPassword}
            </button>
          )}

          {mode === 'signup' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Field label={t.countryLabel}>
                  <select value={form.country} onChange={(e) => set({ country: e.target.value })} className={inputCls}>
                    {COUNTRIES.filter((c) => c.code !== 'ALL').map((c) => (
                      <option key={c.code} value={c.code}>{pick(c.names, lang)}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t.cityLabel}>
                  <input type="text" maxLength={80} autoComplete="address-level2" value={form.city} onChange={(e) => set({ city: e.target.value })} className={inputCls} />
                </Field>
              </div>
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 cursor-pointer">
                <input type="checkbox" required checked={form.acceptedTerms} onChange={(e) => set({ acceptedTerms: e.target.checked })} className="mt-0.5" />
                <span>
                  {t.termsAcceptCheck}{' '}
                  <button type="button" onClick={onShowTerms} className="underline font-bold">({t.readTerms})</button>
                </span>
              </label>
            </>
          )}

          {error && <p role="alert" className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">{error}</p>}
          {info && <p role="status" className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">{info}</p>}

          <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm shadow-md transition">
            {busy ? t.loading : submitLabel}
          </button>

          {mode === 'forgot' && (
            <button type="button" onClick={() => switchMode('login')} className="w-full text-xs font-semibold text-slate-600 hover:underline">
              {t.backToLogin}
            </button>
          )}
        </form>
      </div>
    </Modal>
  );
}

/* ============================ NUOVA PASSWORD (dal link email) ============================ */
export function NewPasswordModal({ t, onClose, onDone }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return setError(t.authErrorWeak);
    setBusy(true);
    setError('');
    try {
      await updatePassword(password);
      onDone();
    } catch (err) {
      setError(t[authErrorKey(err)] || t.authErrorGeneric);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <Modal onClose={onClose} title={t.newPasswordTitle} maxWidth="max-w-md">
      <ModalHeader onClose={onClose} closeLabel={t.closeLabel} title={t.newPasswordTitle} />
      <form onSubmit={submit} className="p-5 sm:p-6 space-y-3.5">
        <Field label={`${t.password} *`}>
          <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.passwordPh} className={inputCls} />
        </Field>
        {error && <p role="alert" className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">{error}</p>}
        <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm">
          {busy ? t.loading : t.newPasswordSubmit}
        </button>
      </form>
    </Modal>
  );
}

/* ============================ PUBBLICA ANNUNCIO ============================ */
const OTHER = '__other';

export function PublishModal({ lang, t, user, defaultCountry, onClose, onShowTerms, onPublish }) {
  const startCountry = defaultCountry && defaultCountry !== 'ALL' ? defaultCountry : user?.country || 'IT';
  const firstCity = COUNTRIES.find((c) => c.code === startCountry)?.cities[0];
  const [ad, setAd] = useState({
    name: user?.name || '',
    phone: '',
    country: startCountry,
    cityChoice: firstCity?.id || OTHER,
    customCity: '',
    zoneChoice: firstCity?.zones[0] || OTHER,
    customZone: '',
    categoryId: CATEGORIES[0].id,
    subcategoryId: CATEGORIES[0].subcategories[0].id,
    title: '',
    description: '',
    hourlyRate: 35,
    callOutFee: 0,
    languages: '',
    skills: '',
    sosAvailable: false,
    acceptedTerms: false,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch) => setAd((a) => ({ ...a, ...patch }));

  const cities = useMemo(() => COUNTRIES.find((c) => c.code === ad.country)?.cities || [], [ad.country]);
  const zones = useMemo(() => cities.find((c) => c.id === ad.cityChoice)?.zones || [], [cities, ad.cityChoice]);
  const subcategories = CATEGORIES.find((c) => c.id === ad.categoryId)?.subcategories || [];
  const currency = currencyOf(ad.country);

  const onCountry = (code) => {
    const c = COUNTRIES.find((x) => x.code === code)?.cities[0];
    set({ country: code, cityChoice: c?.id || OTHER, zoneChoice: c?.zones[0] || OTHER, customCity: '', customZone: '' });
  };
  const onCity = (id) => {
    const z = cities.find((c) => c.id === id)?.zones[0];
    set({ cityChoice: id, zoneChoice: z || OTHER, customZone: '' });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const city = (ad.cityChoice === OTHER ? ad.customCity : ad.cityChoice).trim();
    const zone = (ad.zoneChoice === OTHER || ad.cityChoice === OTHER ? ad.customZone : ad.zoneChoice).trim();
    if (!ad.acceptedTerms || !ad.name.trim() || !ad.title.trim() || !ad.description.trim() || !city || !zone) return;
    if (!isValidPhone(ad.phone)) {
      setError(t.phoneInvalid);
      return;
    }
    setError('');
    setBusy(true);
    const ok = await onPublish({ ...ad, city, zone, currency });
    setBusy(false);
    if (!ok) setError(t.publishError);
  };

  const cityIsOther = ad.cityChoice === OTHER;
  const zoneIsOther = ad.zoneChoice === OTHER || cityIsOther;

  return (
    <Modal onClose={onClose} title={t.publishModalTitle}>
      <ModalHeader onClose={onClose} closeLabel={t.closeLabel} title={t.publishModalTitle} />
      <div className="p-5 sm:p-6">
        <p className="text-xs text-slate-500 mb-5">{t.publishModalSubtitle}</p>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={`${t.businessName} *`}>
              <input type="text" required value={ad.name} onChange={(e) => set({ name: e.target.value })} placeholder={t.businessNamePh} className={inputCls} />
            </Field>
            <Field label={`${t.phoneLabel} *`}>
              <input type="tel" required inputMode="tel" value={ad.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+39 340 1234567" className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label={`${t.countryLabel} *`}>
              <select value={ad.country} onChange={(e) => onCountry(e.target.value)} className={inputCls}>
                {COUNTRIES.filter((c) => c.code !== 'ALL').map((c) => (
                  <option key={c.code} value={c.code}>{pick(c.names, lang)}</option>
                ))}
              </select>
            </Field>
            <Field label={`${t.cityLabel} *`}>
              <select value={ad.cityChoice} onChange={(e) => onCity(e.target.value)} className={inputCls}>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.id}</option>)}
                <option value={OTHER}>{t.otherOption}</option>
              </select>
              {cityIsOther && (
                <input type="text" required value={ad.customCity} onChange={(e) => set({ customCity: e.target.value })} placeholder={t.otherCityPh} className={`${inputCls} mt-1.5`} />
              )}
            </Field>
            <Field label={`${t.zoneLabel} *`}>
              {!cityIsOther && (
                <select value={ad.zoneChoice} onChange={(e) => set({ zoneChoice: e.target.value })} className={inputCls}>
                  {zones.map((z) => <option key={z} value={z}>{z}</option>)}
                  <option value={OTHER}>{t.otherOption}</option>
                </select>
              )}
              {zoneIsOther && (
                <input type="text" required value={ad.customZone} onChange={(e) => set({ customZone: e.target.value })} placeholder={t.otherZonePh} className={`${inputCls} ${cityIsOther ? '' : 'mt-1.5'}`} />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={`${t.categoryMain} *`}>
              <select
                value={ad.categoryId}
                onChange={(e) => {
                  const cat = CATEGORIES.find((c) => c.id === e.target.value);
                  set({ categoryId: cat.id, subcategoryId: cat.subcategories[0].id });
                }}
                className={inputCls}
              >
                {CATEGORIES.map((cat) => <option key={cat.id} value={cat.id}>{pick(cat.names, lang)}</option>)}
              </select>
            </Field>
            <Field label={`${t.categoryService} *`}>
              <select value={ad.subcategoryId} onChange={(e) => set({ subcategoryId: e.target.value })} className={inputCls}>
                {subcategories.map((s) => <option key={s.id} value={s.id}>{pick(s.names, lang)}</option>)}
              </select>
            </Field>
          </div>

          <Field label={`${t.adTitleLabel} *`}>
            <input type="text" required maxLength={110} value={ad.title} onChange={(e) => set({ title: e.target.value })} placeholder={t.adTitlePh} className={inputCls} />
          </Field>
          <Field label={`${t.adBioLabel} *`}>
            <textarea rows={3} required maxLength={800} value={ad.description} onChange={(e) => set({ description: e.target.value })} placeholder={t.adBioPh} className={inputCls} />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label={`${t.hourlyRateLabel} (${currency})`}>
              <input type="number" min="1" max="1000" value={ad.hourlyRate} onChange={(e) => set({ hourlyRate: e.target.value })} className={inputCls} />
            </Field>
            <Field label={`${t.callOutLabel} (${currency})`}>
              <input type="number" min="0" max="1000" value={ad.callOutFee} onChange={(e) => set({ callOutFee: e.target.value })} className={inputCls} />
            </Field>
            <Field label={t.languagesLabel.replace(':', '')}>
              <input type="text" value={ad.languages} onChange={(e) => set({ languages: e.target.value })} placeholder="Italiano, English" className={inputCls} />
            </Field>
          </div>
          <Field label={t.skillsLabel}>
            <input type="text" value={ad.skills} onChange={(e) => set({ skills: e.target.value })} className={inputCls} />
          </Field>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-800 cursor-pointer">
            <input type="checkbox" checked={ad.sosAvailable} onChange={(e) => set({ sosAvailable: e.target.checked })} />
            <span>🚨 {t.sosAvailableCheck}</span>
          </label>

          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 cursor-pointer">
            <input type="checkbox" required checked={ad.acceptedTerms} onChange={(e) => set({ acceptedTerms: e.target.checked })} className="mt-0.5" />
            <span>
              {t.termsAcceptCheck}{' '}
              <button type="button" onClick={onShowTerms} className="underline font-bold">({t.readTerms})</button>
            </span>
          </label>

          {error && <p role="alert" className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">{error}</p>}

          <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm shadow-md transition">
            {busy ? t.loading : t.publishSubmitBtn}
          </button>
        </form>
      </div>
    </Modal>
  );
}

/* ============================ SOS SMART MATCH ============================ */
export function SmartMatchModal({ lang, t, listings, defaultCountry, onClose, onOpen, onShowAll }) {
  const [country, setCountry] = useState(defaultCountry && defaultCountry !== 'ALL' ? defaultCountry : 'IT');
  const [category, setCategory] = useState('home_sos');

  // Condizione AND: SOS disponibile, nel paese scelto E nella categoria scelta, i più rapidi per primi
  const matches = useMemo(
    () =>
      listings
        .filter((l) => l.sosAvailable && l.country === country && l.categoryId === category)
        .sort((a, b) => (a.responseTimeMin ?? 9999) - (b.responseTimeMin ?? 9999))
        .slice(0, 4),
    [listings, country, category]
  );

  return (
    <Modal onClose={onClose} title={t.smartMatchTitle} maxWidth="max-w-xl">
      <ModalHeader onClose={onClose} closeLabel={t.closeLabel} title={t.smartMatchTitle} tone="text-red-600" />
      <div className="p-5 sm:p-6">
        <p className="text-xs font-semibold text-red-800 bg-red-50 border border-red-200 rounded-xl p-2.5 mb-3">🚑 {t.emergencyBar}</p>
        <p className="text-xs text-slate-600 mb-4">{t.smartMatchSubtitle}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <Field label={t.countryLabel}>
            <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls}>
              {COUNTRIES.filter((c) => c.code !== 'ALL').map((c) => (
                <option key={c.code} value={c.code}>{pick(c.names, lang)}</option>
              ))}
            </select>
          </Field>
          <Field label={t.emergencyType}>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              {CATEGORIES.map((cat) => <option key={cat.id} value={cat.id}>{pick(cat.names, lang)}</option>)}
            </select>
          </Field>
        </div>

        <div className="space-y-2.5 mb-5 max-h-64 overflow-y-auto">
          {matches.length === 0 && <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">{t.smartNoResults}</p>}
          {matches.map((pro) => (
            <div key={pro.id} className="p-3 rounded-2xl border border-slate-200 hover:border-blue-400 flex items-center justify-between gap-3 bg-slate-50">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={pro.name} size="w-11 h-11" text="text-sm" />
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-900 truncate">{pro.name} ({pro.city})</div>
                  <div className="text-xs text-red-600 font-semibold">
                    ⚡ {pro.responseTimeMin != null && `${t.responseTimePrefix} ~${pro.responseTimeMin} min • `}
                    {pro.currency}{pro.hourlyRate}{t.perHour}
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => onOpen(pro.id)} className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0">
                {t.contactNowBtn}
              </button>
            </div>
          ))}
        </div>

        <button type="button" onClick={() => onShowAll(country, category)} className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm">
          {t.showAllSos}
        </button>
      </div>
    </Modal>
  );
}

/* ============================ PROFILO UTENTE ============================ */
export function ProfileModal({ lang, t, user, listings, favorites, onClose, onOpen, onPublish, onToggleRole, onLogout, onDeleteAd }) {
  const favs = listings.filter((l) => favorites.includes(l.id));
  const mine = listings.filter((l) => l.ownerId === user.id);

  return (
    <Modal onClose={onClose} title={user.name} maxWidth="max-w-lg">
      <ModalHeader onClose={onClose} closeLabel={t.closeLabel} title={user.name} />
      <div className="p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} size="w-12 h-12" />
          <p className="text-xs text-slate-500 break-all">
            {user.email}
            {user.city ? ` • ${user.city}` : ''} {user.country ? `(${countryName(user.country, lang)})` : ''}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-slate-800">{t.profileMode}</div>
            <div className="text-[11px] text-slate-500">{t.profileModeDesc}</div>
          </div>
          <button type="button" onClick={onToggleRole} className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0">
            {user.role === 'pro' ? `🛠️ ${t.rolePro}` : `👤 ${t.roleClient}`}
          </button>
        </div>

        <section>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{t.myAds} ({mine.length})</h4>
          {mine.length === 0 ? (
            <p className="text-xs text-slate-500">{t.noMyAds}</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {mine.map((ad) => (
                <div key={ad.id} className="p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs">
                  <button type="button" onClick={() => onOpen(ad.id)} className="font-bold text-slate-800 hover:text-blue-600 text-left truncate">
                    {pick(ad.titles, lang)}
                  </button>
                  <button type="button" onClick={() => onDeleteAd(ad.id)} className="inline-flex items-center gap-1 text-rose-600 font-bold hover:underline shrink-0">
                    <Trash2 className="w-3.5 h-3.5" /> {t.deleteAd}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{t.savedPros} ({favs.length})</h4>
          {favs.length === 0 ? (
            <p className="text-xs text-slate-500">{t.noSaved}</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {favs.map((fav) => (
                <div key={fav.id} className="p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-800 truncate">{fav.name} — {fav.city}</span>
                  <button type="button" onClick={() => onOpen(fav.id)} className="text-blue-600 font-bold hover:underline shrink-0">{t.openProfile}</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <button type="button" onClick={onPublish} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">
            {t.publishAdBtn}
          </button>
          <button type="button" onClick={onLogout} className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5">
            <LogOut className="w-3.5 h-3.5" /> {t.logout}
          </button>
        </div>
      </div>
    </Modal>
  );
}
