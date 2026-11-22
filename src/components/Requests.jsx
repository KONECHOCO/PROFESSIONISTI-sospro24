// Bacheca "Richieste": i clienti scrivono cosa cercano ("Cerco un idraulico zona Piacenza"),
// i professionisti registrati vedono il numero e li contattano.
import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Phone, MessageCircle, Flag as FlagIcon, UserX, Trash2, CheckCircle2, Megaphone, Clock, ShieldCheck } from 'lucide-react';
import { Avatar, Modal, ModalHeader } from './ui';
import Flag from './Flag';
import { COUNTRIES, CATEGORIES } from '../data';
import {
  pick, countryName, categoryName, subcategoryName, timeAgo, fmt, telHref, whatsappHref, isValidPhone,
} from '../lib/utils';

const inputCls = 'w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelCls = 'block text-xs font-bold text-slate-700 mb-1';
const OTHER = '__other';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

const place = (r) => (r.zone ? `${r.city} · ${r.zone}` : r.city);

/* ============================ INVITO A PUBBLICARE ============================ */
export function RequestCta({ t, onPublish, compact = false }) {
  return (
    <div className={`rounded-2xl border border-blue-200 bg-blue-50 ${compact ? 'p-4' : 'p-5'} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0"><Megaphone className="w-5 h-5" /></div>
        <div>
          <h3 className="font-extrabold text-sm sm:text-base text-blue-950">{t.reqCtaTitle}</h3>
          <p className="text-xs sm:text-sm text-blue-900/90 leading-relaxed">{t.reqCtaText}</p>
        </div>
      </div>
      <button type="button" onClick={onPublish} className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shrink-0 shadow-sm">
        {t.reqPublishBtn}
      </button>
    </div>
  );
}

/* ============================ SCHEDA NELL'ELENCO ============================ */
export function RequestCard({ request, lang, t, isMine, onOpen }) {
  return (
    <article className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 min-w-0">
          <span className="shrink-0 inline-flex items-center gap-1.5"><Flag code={request.country} />{countryName(request.country, lang)}</span>
          <span className="text-slate-300">•</span>
          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="truncate">{place(request)}</span>
        </div>
        {request.urgent && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-200 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 sos-pulse" />
            {t.reqUrgentBadge}
          </span>
        )}
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="text-xs font-bold text-blue-600 mb-2">
          {categoryName(request.categoryId, lang)} → {subcategoryName(request.categoryId, request.subcategoryId, lang)}
        </div>
        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line line-clamp-4 flex-1">“{request.body}”</p>
        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{request.author} · {timeAgo(request.createdAt, lang)}</span>
          </span>
          {isMine && <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold shrink-0">{t.reqYours}</span>}
        </div>
        <button
          type="button"
          onClick={() => onOpen(request.id)}
          className="mt-4 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5"
        >
          <MessageCircle className="w-4 h-4" /> {isMine ? t.reqManage : t.reqReply}
        </button>
      </div>
    </article>
  );
}

/* ============================ DETTAGLIO + CONTATTO ============================ */
export function RequestModal({ request, lang, t, currentUser, loadContact, onClose, onLogin, onReport, onBlockUser, onCloseRequest, onDelete }) {
  const isMine = !!currentUser && request.ownerId === currentUser.id;
  const [phone, setPhone] = useState(undefined);

  useEffect(() => {
    if (!currentUser) return undefined;
    let alive = true;
    setPhone(undefined);
    loadContact(request.id)
      .then((p) => alive && setPhone(p))
      .catch(() => alive && setPhone(null));
    return () => { alive = false; };
  }, [request.id, currentUser, loadContact]);

  const waText = fmt(t.reqWhatsappText, { text: request.body.length > 90 ? `${request.body.slice(0, 90)}…` : request.body });

  return (
    <Modal onClose={onClose} title={t.reqDetailTitle} maxWidth="max-w-xl">
      <ModalHeader
        onClose={onClose}
        closeLabel={t.closeLabel}
        title={`${countryName(request.country, lang)} • ${place(request)}`}
        tone="text-blue-600 uppercase tracking-wider text-xs sm:text-sm"
      />
      <div className="p-5 sm:p-6 space-y-5">
        <div className="flex items-start gap-3.5">
          <Avatar name={request.author} size="w-12 h-12" text="text-base" />
          <div className="min-w-0">
            <div className="font-extrabold text-slate-900">{fmt(t.reqBy, { name: request.author })}</div>
            <div className="text-xs text-slate-500">{timeAgo(request.createdAt, lang)} · {fmt(t.reqExpires, { when: timeAgo(request.expiresAt, lang) })}</div>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="text-xs font-bold text-blue-600">
                {categoryName(request.categoryId, lang)} → {subcategoryName(request.categoryId, request.subcategoryId, lang)}
              </span>
              {request.urgent && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 sos-pulse" />{t.reqUrgentBadge}
                </span>
              )}
              {request.status !== 'active' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-700">{t.reqClosedBadge}</span>
              )}
            </div>
          </div>
        </div>

        <p className="text-base text-slate-800 leading-relaxed whitespace-pre-line bg-slate-50 border border-slate-200 rounded-2xl p-4">“{request.body}”</p>

        {isMine ? (
          <div className="flex flex-wrap gap-2">
            {request.status === 'active' && (
              <button type="button" onClick={() => onCloseRequest(request.id)} className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> {t.reqCloseBtn}
              </button>
            )}
            <button type="button" onClick={() => onDelete(request.id)} className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold inline-flex items-center gap-1.5">
              <Trash2 className="w-4 h-4" /> {t.reqDeleteBtn}
            </button>
          </div>
        ) : (
          <div className="bg-slate-900 text-white rounded-2xl p-5">
            {currentUser ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-blue-400 font-bold">{t.reqContactTitle}</div>
                  <div className="text-lg font-extrabold mt-0.5">📞 {phone === undefined ? t.contactLoading : phone || '—'}</div>
                </div>
                {phone && (
                  <div className="flex flex-wrap gap-2">
                    <a href={telHref(phone)} className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5">
                      <Phone className="w-4 h-4" /> {t.callBtn}
                    </a>
                    <a href={whatsappHref(phone, waText)} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4" /> {t.whatsappBtn}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-amber-400 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> {t.memberRequiredTitle}</h4>
                  <p className="text-xs text-slate-300 mt-1">{t.reqLoginToReply}</p>
                </div>
                <button type="button" onClick={onLogin} className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shrink-0">
                  {t.loginRegisterBtn}
                </button>
              </div>
            )}
          </div>
        )}

        <p className="text-[11px] text-slate-500 leading-relaxed">{t.reqSafetyNote}</p>

        {!isMine && (
          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-100 text-xs">
            <button type="button" onClick={() => onReport(request.id)} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-rose-700 font-semibold">
              <FlagIcon className="w-3.5 h-3.5" /> {t.reqReport}
            </button>
            {currentUser && (
              <button type="button" onClick={() => onBlockUser(request.ownerId)} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-rose-700 font-semibold">
                <UserX className="w-3.5 h-3.5" /> {t.blockUser}
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ============================ PUBBLICA RICHIESTA ============================ */
export function PublishRequestModal({ lang, t, user, defaultCountry, defaultCity, defaultCategory, onClose, onShowTerms, onPublish }) {
  const startCountry = defaultCountry && defaultCountry !== 'ALL' ? defaultCountry : user?.country || 'IT';
  const cityList = COUNTRIES.find((c) => c.code === startCountry)?.cities || [];
  const startCity = defaultCity && defaultCity !== 'ALL' && cityList.some((c) => c.id === defaultCity) ? defaultCity : cityList[0]?.id || OTHER;
  const startCat = CATEGORIES.find((c) => c.id === defaultCategory) || CATEGORIES[0];
  const [form, setForm] = useState({
    country: startCountry,
    cityChoice: startCity,
    customCity: '',
    zoneChoice: '',
    customZone: '',
    categoryId: startCat.id,
    subcategoryId: startCat.subcategories[0].id,
    body: '',
    urgent: false,
    phone: '',
    acceptedTerms: false,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const cities = useMemo(() => COUNTRIES.find((c) => c.code === form.country)?.cities || [], [form.country]);
  const zones = useMemo(() => cities.find((c) => c.id === form.cityChoice)?.zones || [], [cities, form.cityChoice]);
  const subcategories = CATEGORIES.find((c) => c.id === form.categoryId)?.subcategories || [];
  const cityIsOther = form.cityChoice === OTHER;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const city = (cityIsOther ? form.customCity : form.cityChoice).trim();
    const zone = (cityIsOther || form.zoneChoice === OTHER ? form.customZone : form.zoneChoice).trim();
    if (!form.acceptedTerms || !city) return;
    if (form.body.trim().length < 10) return setError(t.reqTooShort);
    if (!isValidPhone(form.phone)) return setError(t.phoneInvalid);
    setError('');
    setBusy(true);
    const ok = await onPublish({ ...form, city, zone });
    setBusy(false);
    if (!ok) setError(t.reqPublishError);
  };

  return (
    <Modal onClose={onClose} title={t.reqModalTitle}>
      <ModalHeader onClose={onClose} closeLabel={t.closeLabel} title={t.reqModalTitle} icon={<Megaphone className="w-5 h-5 text-blue-600" />} />
      <div className="p-5 sm:p-6">
        <p className="text-xs text-slate-500 mb-5">{t.reqModalSubtitle}</p>
        <form onSubmit={submit} className="space-y-4">
          <Field label={`${t.reqTextLabel} *`}>
            <textarea
              rows={4}
              required
              minLength={10}
              maxLength={500}
              value={form.body}
              onChange={(e) => set({ body: e.target.value })}
              placeholder={t.reqTextPh}
              className={inputCls}
            />
            <span className="block text-[11px] text-slate-500 mt-1">{t.reqNoPersonal} · {form.body.length}/500</span>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={`${t.categoryMain} *`}>
              <select
                value={form.categoryId}
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
              <select value={form.subcategoryId} onChange={(e) => set({ subcategoryId: e.target.value })} className={inputCls}>
                {subcategories.map((s) => <option key={s.id} value={s.id}>{pick(s.names, lang)}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label={`${t.countryLabel} *`}>
              <select
                value={form.country}
                onChange={(e) => {
                  const c = COUNTRIES.find((x) => x.code === e.target.value)?.cities[0];
                  set({ country: e.target.value, cityChoice: c?.id || OTHER, zoneChoice: '', customCity: '', customZone: '' });
                }}
                className={inputCls}
              >
                {COUNTRIES.filter((c) => c.code !== 'ALL').map((c) => <option key={c.code} value={c.code}>{pick(c.names, lang)}</option>)}
              </select>
            </Field>
            <Field label={`${t.cityLabel} *`}>
              <select value={form.cityChoice} onChange={(e) => set({ cityChoice: e.target.value, zoneChoice: '', customZone: '' })} className={inputCls}>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.id}</option>)}
                <option value={OTHER}>{t.otherOption}</option>
              </select>
              {cityIsOther && (
                <input type="text" required maxLength={80} value={form.customCity} onChange={(e) => set({ customCity: e.target.value })} placeholder={t.otherCityPh} className={`${inputCls} mt-1.5`} />
              )}
            </Field>
            <Field label={t.zoneLabel}>
              {!cityIsOther && (
                <select value={form.zoneChoice} onChange={(e) => set({ zoneChoice: e.target.value })} className={inputCls}>
                  <option value="">{t.reqWholeCity}</option>
                  {zones.map((z) => <option key={z} value={z}>{z}</option>)}
                  <option value={OTHER}>{t.otherOption}</option>
                </select>
              )}
              {(cityIsOther || form.zoneChoice === OTHER) && (
                <input type="text" maxLength={80} value={form.customZone} onChange={(e) => set({ customZone: e.target.value })} placeholder={t.otherZonePh} className={`${inputCls} ${cityIsOther ? '' : 'mt-1.5'}`} />
              )}
            </Field>
          </div>

          <Field label={`${t.reqPhoneLabel} *`}>
            <input type="tel" required inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+39 340 1234567" className={inputCls} />
            <span className="block text-[11px] text-slate-500 mt-1">{t.reqPhoneNote}</span>
          </Field>

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-800 cursor-pointer">
            <input type="checkbox" checked={form.urgent} onChange={(e) => set({ urgent: e.target.checked })} />
            <span>🚨 {t.reqUrgentCheck}</span>
          </label>

          <p className="text-[11px] text-slate-500">{t.reqPublicNote}</p>

          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 cursor-pointer">
            <input type="checkbox" required checked={form.acceptedTerms} onChange={(e) => set({ acceptedTerms: e.target.checked })} className="mt-0.5" />
            <span>
              {t.termsAcceptCheck}{' '}
              <button type="button" onClick={onShowTerms} className="underline font-bold">({t.readTerms})</button>
            </span>
          </label>

          {error && <p role="alert" className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">{error}</p>}

          <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm shadow-md transition">
            {busy ? t.loading : t.reqSubmit}
          </button>
        </form>
      </div>
    </Modal>
  );
}
