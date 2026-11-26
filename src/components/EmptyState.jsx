import React, { useEffect, useState } from 'react';
import { Briefcase, CheckCircle2, Megaphone } from 'lucide-react';
import { joinWaitlist, waitlistCount } from '../lib/api';
import { fmt, countryName, categoryName } from '../lib/utils';
import ExampleCard, { pickExamples } from './ExampleCard';

// Mostrata quando la ricerca non trova nessuno: invece di perdere il cliente gli proponiamo
// di pubblicare una richiesta (o di lasciare l'email); ai professionisti chiediamo di essere i primi.
export default function EmptyState({ t, lang, country, city, categoryId, subcategoryId = 'ALL', showExample = false, hasFilters, onReset, onPublish, onPublishRequest }) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [waiting, setWaiting] = useState(0);

  const place = country !== 'ALL' ? country : null;
  const cityValue = city !== 'ALL' ? city : '';
  const categoryValue = categoryId !== 'ALL' ? categoryId : '';

  useEffect(() => {
    setDone(false);
    setError('');
    if (!place) return setWaiting(0);
    let alive = true;
    waitlistCount({ country: place, city: cityValue, categoryId: categoryValue })
      .then((n) => alive && setWaiting(n))
      .catch(() => alive && setWaiting(0));
    return () => { alive = false; };
  }, [place, cityValue, categoryValue]);

  const submit = async (e) => {
    e.preventDefault();
    if (!place) return setError(t.waitlistNeedPlace);
    if (!consent || busy) return undefined;
    setBusy(true);
    setError('');
    try {
      await joinWaitlist({ email, country: place, city: cityValue, categoryId: categoryValue, lang });
      setDone(true);
      setWaiting((n) => n + 1);
      setEmail('');
    } catch {
      setError(t.actionError);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const where = [categoryValue && categoryName(categoryValue, lang), cityValue, place && countryName(place, lang)]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 my-4">
      {/* Clienti: richiesta pubblica oppure lista d'attesa */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600"><Megaphone className="w-5 h-5" /></div>
          <h3 className="text-lg font-extrabold text-slate-900">{t.emptyTitle}</h3>
        </div>
        {where && <p className="text-xs font-bold text-blue-600 mb-2">{where}</p>}
        <p className="text-sm text-slate-600 mb-4">{t.emptyText}</p>
        {onPublishRequest && (
          <button type="button" onClick={onPublishRequest} className="w-full sm:w-auto px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-sm">
            {t.reqPublishBtn}
          </button>
        )}
        <p className="mt-5 mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{t.emptyOrNotify}</p>
        {waiting > 0 && (
          <p className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 mb-4">
            👥 {waiting === 1 ? t.waitlistWaitingOne : fmt(t.waitlistWaiting, { n: waiting })}
          </p>
        )}

        {done ? (
          <p role="status" className="flex items-start gap-2 text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" /> {t.waitlistDone}
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.waitlistEmailPh}
                aria-label={t.waitlistEmailPh}
                className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="submit" disabled={busy} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm shrink-0">
                {busy ? t.loading : t.waitlistSubmit}
              </button>
            </div>
            <label className="flex items-start gap-2 text-[11px] text-slate-600 cursor-pointer">
              <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
              <span>{t.waitlistConsent}</span>
            </label>
            {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}
          </form>
        )}

        {hasFilters && (
          <button type="button" onClick={onReset} className="mt-4 text-xs font-semibold text-blue-600 hover:underline">
            {t.resetFilters}
          </button>
        )}
      </section>

      {/* Professioniste: invito a essere le prime */}
      <section className="bg-gradient-to-br from-slate-900 to-blue-900 text-white rounded-2xl p-6 shadow-sm flex flex-col">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-xl bg-white/10 text-blue-200"><Briefcase className="w-5 h-5" /></div>
          <h3 className="text-lg font-extrabold">{t.beFirstTitle}</h3>
        </div>
        <p className="text-sm text-slate-200 mb-5 flex-1">{t.beFirstText}</p>
        {showExample && (
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">{t.emptyExampleTitle}</p>
            {/* Esempio dichiarato per il servizio/città cercati (o il primo servizio della categoria) */}
            {(() => {
              const ex = categoryId !== 'ALL' ? pickExamples(categoryId, subcategoryId)[0] : pickExamples('ALL', 'ALL')[0];
              return (
                <ExampleCard
                  categoryId={ex.categoryId}
                  subcategoryId={ex.subcategoryId}
                  place={cityValue || (place ? countryName(place, lang) : t.exampleYourCity)}
                  city={cityValue || null}
                  lang={lang}
                  t={t}
                  onPublish={onPublish}
                  compact
                />
              );
            })()}
          </div>
        )}
        <button type="button" onClick={onPublish} className="self-start px-5 py-3 rounded-xl bg-white text-slate-900 hover:bg-blue-50 font-extrabold text-sm">
          {t.beFirstBtn}
        </button>
      </section>
    </div>
  );
}
