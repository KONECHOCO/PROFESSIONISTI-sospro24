import React, { useMemo, useState } from 'react';
import { ShieldCheck, LogOut, Trash2, Info } from 'lucide-react';
import { Avatar, Modal, ModalHeader } from './ui';
import { COUNTRIES, CATEGORIES, LEGAL_SECTIONS } from '../data';
import { pick, isValidPhone, currencyOf, countryName } from '../lib/utils';

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
export function AuthModal({ lang, t, onClose, onDemoLogin, onRegister, onShowTerms }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'client', country: 'IT', city: '', acceptedTerms: false });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.acceptedTerms || !form.name.trim() || !form.email.trim()) return;
    onRegister(form);
  };

  return (
    <Modal onClose={onClose} title={t.loginRegisterBtn} maxWidth="max-w-md">
      <ModalHeader onClose={onClose} closeLabel={t.closeLabel} title={t.loginRegisterBtn} />
      <div className="p-5 sm:p-6">
        <p className="text-xs text-slate-600 mb-3 leading-relaxed">{t.memberRequiredDesc}</p>
        <p className="flex items-start gap-2 text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-4">
          <Info className="w-4 h-4 shrink-0 text-amber-600" />
          {t.prototypeNote}
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 mb-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800 mb-2">⚡ {t.demoLoginTitle}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button type="button" onClick={() => onDemoLogin('client')} className="px-3 py-2 rounded-xl bg-white hover:bg-blue-600 hover:text-white text-blue-900 border border-blue-200 text-xs font-bold transition">
              👤 {t.roleClient}
            </button>
            <button type="button" onClick={() => onDemoLogin('pro')} className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition">
              🛠️ {t.rolePro}
            </button>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3.5">
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
            <input type="text" required autoComplete="name" value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder={t.fullNamePh} className={inputCls} />
          </Field>
          <Field label={`${t.email} *`}>
            <input type="email" required autoComplete="email" value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="nome@email.com" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t.countryLabel}>
              <select value={form.country} onChange={(e) => set({ country: e.target.value })} className={inputCls}>
                {COUNTRIES.filter((c) => c.code !== 'ALL').map((c) => (
                  <option key={c.code} value={c.code}>{c.flag} {pick(c.names, lang)}</option>
                ))}
              </select>
            </Field>
            <Field label={t.cityLabel}>
              <input type="text" value={form.city} onChange={(e) => set({ city: e.target.value })} className={inputCls} />
            </Field>
          </div>

          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 cursor-pointer">
            <input type="checkbox" required checked={form.acceptedTerms} onChange={(e) => set({ acceptedTerms: e.target.checked })} className="mt-0.5" />
            <span>
              {t.termsAcceptCheck}{' '}
              <button type="button" onClick={onShowTerms} className="underline font-bold">({t.readTerms})</button>
            </span>
          </label>

          <button type="submit" className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition">
            {t.registerSubmit}
          </button>
        </form>
      </div>
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

  const submit = (e) => {
    e.preventDefault();
    const city = (ad.cityChoice === OTHER ? ad.customCity : ad.cityChoice).trim();
    const zone = (ad.zoneChoice === OTHER || ad.cityChoice === OTHER ? ad.customZone : ad.zoneChoice).trim();
    if (!ad.acceptedTerms || !ad.name.trim() || !ad.title.trim() || !ad.description.trim() || !city || !zone) return;
    if (!isValidPhone(ad.phone)) {
      setError(t.phoneInvalid);
      return;
    }
    setError('');
    onPublish({ ...ad, city, zone, currency });
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
                  <option key={c.code} value={c.code}>{c.flag} {pick(c.names, lang)}</option>
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

          <button type="submit" className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition">
            {t.publishSubmitBtn}
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
                <option key={c.code} value={c.code}>{c.flag} {pick(c.names, lang)}</option>
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
