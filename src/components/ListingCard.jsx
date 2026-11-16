import React from 'react';
import { MapPin, ShieldCheck, Star, Phone, MessageCircle, Heart, Clock } from 'lucide-react';
import { Avatar } from './ui';
import { countryName, subcategoryName, pick } from '../lib/utils';

export default function ListingCard({ pro, lang, t, isFav, onToggleFav, onOpen, onContact }) {
  return (
    <article className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 min-w-0">
          <span className="shrink-0">{countryName(pro.country, lang)}</span>
          <span className="text-slate-300">•</span>
          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="truncate">
            {pro.city} ({pro.zone})
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {pro.demo && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-700 border border-slate-300">
              {t.demoBadge}
            </span>
          )}
          {pro.sosAvailable && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 sos-pulse" />
              {t.availableNowBadge}
            </span>
          )}
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start gap-3.5 mb-3">
          <Avatar name={pro.name} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-base text-slate-900 truncate">{pro.name}</h3>
              {pro.verified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" />
                  {t.verifiedBadge}
                </span>
              )}
            </div>
            <div className="text-xs font-semibold text-blue-600 mt-0.5">
              {subcategoryName(pro.categoryId, pro.subcategoryId, lang)}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs flex-wrap">
              {pro.rating !== null ? (
                <span className="inline-flex items-center gap-1 font-bold text-slate-900">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {pro.rating.toFixed(1)}
                  <span className="text-slate-500 font-normal">
                    ({pro.reviewsCount} {t.reviewsLabel})
                  </span>
                </span>
              ) : (
                <span className="text-slate-500">{t.noReviewsYet}</span>
              )}
              {pro.responseTimeMin != null && (
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {t.responseTimePrefix} ~{pro.responseTimeMin}m
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onToggleFav(pro.id)}
            aria-pressed={isFav}
            aria-label={isFav ? t.favoriteRemove : t.favoriteAdd}
            title={isFav ? t.favoriteRemove : t.favoriteAdd}
            className={`p-2 rounded-xl border transition ${
              isFav ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500' : ''}`} />
          </button>
        </div>

        <h4 className="font-bold text-sm text-slate-800 leading-snug mb-2 line-clamp-2">{pick(pro.titles, lang)}</h4>
        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-3">{pick(pro.descriptions, lang)}</p>

        <div className="flex flex-wrap gap-1.5 mb-4 mt-auto">
          {pro.skills.slice(0, 3).map((skill, idx) => (
            <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
              {skill}
            </span>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 text-xs mb-4">
          <div>
            <span className="text-slate-500">{t.fromPrice} </span>
            <span className="text-base font-extrabold text-slate-900">
              {pro.currency}
              {pro.hourlyRate}
            </span>
            <span className="text-slate-500">{t.perHour}</span>
            <span className="block text-[11px] text-slate-500">
              {t.callOutFee} {pro.callOutFee === 0 ? t.freeQuote : `${pro.currency}${pro.callOutFee}`}
            </span>
          </div>
          <div className="text-right min-w-0">
            <span className="text-[11px] text-slate-500 block">{t.languagesLabel}</span>
            <span className="text-[11px] font-semibold text-slate-700">{pro.languages.join(', ')}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onOpen(pro.id)}
            className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
            {t.viewReviewsBtn} ({pro.reviewsCount})
          </button>
          <button
            type="button"
            onClick={() => onContact(pro.id)}
            className="px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <Phone className="w-3.5 h-3.5" />
            {t.contactNowBtn}
          </button>
        </div>
      </div>
    </article>
  );
}
