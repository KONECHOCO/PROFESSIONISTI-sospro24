// Annuncio DI ESEMPIO, dichiarato come tale: mostra a professionisti e clienti come appare un annuncio.
// Niente nome reale, niente telefono, niente recensioni, fuori da ogni conteggio: al posto di
// "Contatta" c'è "Pubblica il tuo annuncio gratis". Si spengono con SHOW_EXAMPLES (lib/supabase.js).
import React from 'react';
import { MapPin, PlusCircle, Info } from 'lucide-react';
import { CATEGORIES } from '../data';
import { pick, fmt } from '../lib/utils';

// Tariffa orientativa mostrata nell'esempio (solo indicativa, chiaramente "esempio")
const SAMPLE_RATE = {
  plumber: 40, electrician: 40, locksmith: 50, hvac: 45, handyman: 30,
  babysitter: 12, eldercare: 14, nurse: 30, cleaning: 18, petsitter: 12,
  hair_makeup: 30, esthetics: 35, tailor: 20, chef: 40, photo: 50,
  it_repair: 35, web_software: 45, translator: 30, tutor: 20, legal_tax: 50,
};

// Elenco degli esempi da mostrare in base ai filtri: un servizio scelto → 1, una categoria → i suoi servizi,
// nessun filtro → 2 per categoria
export function pickExamples(categoryId, subcategoryId) {
  if (categoryId !== 'ALL' && subcategoryId !== 'ALL') return [{ categoryId, subcategoryId }];
  if (categoryId !== 'ALL') {
    const c = CATEGORIES.find((x) => x.id === categoryId);
    return (c?.subcategories || []).map((s) => ({ categoryId, subcategoryId: s.id }));
  }
  return CATEGORIES.flatMap((c) => c.subcategories.slice(0, 2).map((s) => ({ categoryId: c.id, subcategoryId: s.id })));
}

// place = etichetta in alto (città o paese); city = città scelta, usata nel titolo solo se c'è
export default function ExampleCard({ categoryId, subcategoryId, place, city, lang, t, onPublish, compact = false }) {
  const cat = CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[0];
  const sub = cat.subcategories.find((s) => s.id === subcategoryId) || cat.subcategories[0];
  const service = pick(sub.names, lang);
  const rate = SAMPLE_RATE[sub.id] || 30;
  return (
    <article className="relative bg-white/80 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col overflow-hidden" aria-label={t.exampleNote}>
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 min-w-0">
          <MapPin className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{place}</span>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">{t.exampleBadge}</span>
      </div>
      {/* Foto illustrativa del servizio (Unsplash, salvata in public/examples): mani e attrezzi, non una persona "reale" */}
      <div className="relative aspect-[16/9] bg-slate-100 overflow-hidden">
        <img
          src={`/examples/${sub.id}.webp`}
          alt=""
          loading="lazy"
          decoding="async"
          width="640"
          height="360"
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
        />
        <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/55 text-white text-[10px] font-semibold">{t.examplePhoto}</span>
      </div>
      <div className={`${compact ? 'p-4' : 'p-5'} flex-1 flex flex-col`}>
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-full bg-slate-200 border-2 border-dashed border-slate-300 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-slate-500 italic leading-snug">{t.exampleName}</h3>
            <div className="text-xs font-semibold text-blue-600 mt-0.5">{service}</div>
          </div>
        </div>
        <h4 className="font-bold text-sm text-slate-700 leading-snug mb-2">{city ? fmt(t.exampleTitle, { service, place: city }) : service}</h4>
        <p className="text-xs text-slate-500 leading-relaxed mb-3">{t.exampleDesc}</p>
        <div className="pt-3 mt-auto border-t border-slate-100 flex items-center justify-between text-xs mb-3">
          <span className="text-slate-500">{t.fromPrice} <span className="text-base font-extrabold text-slate-600">€{rate}</span>{t.perHour}</span>
          <span className="text-[11px] text-slate-400 italic">{t.exampleRate}</span>
        </div>
        <p className="flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mb-3">
          <Info className="w-3.5 h-3.5 shrink-0 mt-px" /> {t.exampleNote}
        </p>
        <button type="button" onClick={onPublish} className="w-full px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm">
          <PlusCircle className="w-4 h-4" /> {t.exampleCta}
        </button>
      </div>
    </article>
  );
}
