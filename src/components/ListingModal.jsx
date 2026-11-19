import React, { useEffect, useState } from 'react';
import { ShieldCheck, Star, Phone, MessageCircle, AlertTriangle, ThumbsUp, Flag, Send, Info, UserX } from 'lucide-react';
import { Avatar, Modal, ModalHeader, Stars } from './ui';
import { FEEDBACK_TAGS } from '../data';
import {
  categoryName, subcategoryName, countryName, pick, fmt, timeAgo, telHref, whatsappHref,
} from '../lib/utils';

export default function ListingModal({
  listing, lang, t, currentUser, myVotes, loadContact,
  onClose, onLogin, onAddReview, onHelpful, onReportReview, onReportAd, onBlockUser, onToast,
}) {
  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  // Telefono: per gli annunci reali viene letto dal database SOLO se l'utente è registrato
  const [phone, setPhone] = useState(listing.demo ? listing.phone : undefined);

  useEffect(() => {
    if (listing.demo || !currentUser) return undefined;
    let alive = true;
    setPhone(undefined);
    loadContact(listing.id)
      .then((p) => alive && setPhone(p))
      .catch(() => alive && setPhone(null));
    return () => { alive = false; };
  }, [listing.id, listing.demo, currentUser, loadContact]);

  const tagLabels = FEEDBACK_TAGS[lang] || FEEDBACK_TAGS.it;
  const isOwner = !!currentUser && listing.ownerId === currentUser.id;
  const alreadyReviewed = !!currentUser && listing.reviews.some((r) => r.userId === currentUser.id);

  const demoNotice = () => onToast(t.demoContactNotice, 'error');

  const submitReview = async (e) => {
    e.preventDefault();
    if (!currentUser) return onLogin();
    if (sending) return;
    setSending(true);
    const res = await onAddReview(listing.id, { rating, tags, comment });
    setSending(false);
    if (res.ok) {
      setComment('');
      setTags([]);
      setRating(5);
    }
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    if (listing.demo) return demoNotice();
    if (!phone) return;
    window.open(whatsappHref(phone, message.trim()), '_blank', 'noopener,noreferrer');
    setMessage('');
  };

  return (
    <Modal onClose={onClose} title={listing.name} maxWidth="max-w-3xl">
      <ModalHeader
        onClose={onClose}
        closeLabel={t.closeLabel}
        title={`${countryName(listing.country, lang)} • ${listing.city} — ${listing.zone}`}
        tone="text-blue-600 uppercase tracking-wider text-xs sm:text-sm"
      />

      <div className="p-5 sm:p-6 space-y-6">
        {/* Intestazione profilo */}
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <Avatar name={listing.name} size="w-20 h-20" text="text-2xl" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="text-2xl font-extrabold text-slate-900">{listing.name}</h2>
              {listing.demo && (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-xs font-extrabold">{t.demoBadge}</span>
              )}
              {listing.verified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {t.verifiedBadge}
                </span>
              )}
              {listing.sosAvailable && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-extrabold">
                  <span className="w-2 h-2 rounded-full bg-red-600 sos-pulse" />
                  {t.availableNowBadge}
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-blue-600 mb-2">
              {categoryName(listing.categoryId, lang)} → {subcategoryName(listing.categoryId, listing.subcategoryId, lang)}
            </p>
            <h3 className="text-base font-bold text-slate-800 mb-2">{pick(listing.titles, lang)}</h3>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{pick(listing.descriptions, lang)}</p>

            {listing.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {listing.skills.map((s, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">{s}</span>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2.5 text-xs">
              <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 font-bold text-amber-900 flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                {listing.rating !== null ? `${listing.rating.toFixed(1)} (${listing.reviewsCount} ${listing.reviewsCount === 1 ? t.reviewsLabelOne : t.reviewsLabel})` : t.noReviewsYet}
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-100 font-semibold text-slate-700">
                {t.fromPrice} <span className="font-extrabold text-slate-900">{listing.currency}{listing.hourlyRate}{t.perHour}</span>
                {' • '}{t.callOutFee} {listing.callOutFee === 0 ? t.freeQuote : `${listing.currency}${listing.callOutFee}`}
              </div>
              {listing.experienceYears ? (
                <div className="px-3 py-1.5 rounded-xl bg-slate-100 font-semibold text-slate-700">
                  {t.experienceLabel} {listing.experienceYears} {t.years}
                </div>
              ) : null}
              <div className="px-3 py-1.5 rounded-xl bg-slate-100 font-semibold text-slate-700">
                {t.languagesLabel} {listing.languages.join(', ')}
              </div>
            </div>
          </div>
        </div>

        {/* Contatto diretto (solo utenti registrati) */}
        <div className="bg-slate-900 text-white rounded-2xl p-5">
          {currentUser ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-blue-400 font-bold">{t.directContact}</div>
                  <div className="text-lg font-extrabold mt-0.5">
                    📞 {phone === undefined ? t.contactLoading : phone || '—'}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!listing.demo && !phone ? null : listing.demo ? (
                    <>
                      <button type="button" onClick={demoNotice} className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5">
                        <Phone className="w-4 h-4" /> {t.callBtn}
                      </button>
                      <button type="button" onClick={demoNotice} className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5">
                        <MessageCircle className="w-4 h-4" /> {t.whatsappBtn}
                      </button>
                    </>
                  ) : (
                    <>
                      <a href={telHref(phone)} className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5">
                        <Phone className="w-4 h-4" /> {t.callBtn}
                      </a>
                      <a href={whatsappHref(phone)} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5">
                        <MessageCircle className="w-4 h-4" /> {t.whatsappBtn}
                      </a>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  aria-label={fmt(t.writePlaceholder, { name: listing.name })}
                  placeholder={fmt(t.writePlaceholder, { name: listing.name })}
                  className="flex-1 min-w-0 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                />
                <button type="button" onClick={sendMessage} className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 shrink-0">
                  <Send className="w-3.5 h-3.5" /> {t.sendBtn}
                </button>
              </div>
              {listing.demo && (
                <p className="flex items-start gap-2 text-[11px] text-amber-300"><Info className="w-4 h-4 shrink-0" />{t.demoContactNotice}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-amber-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> {t.memberRequiredTitle}
                </h4>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">{t.memberRequiredDesc}</p>
              </div>
              <button type="button" onClick={onLogin} className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shrink-0">
                {t.loginRegisterBtn}
              </button>
            </div>
          )}
        </div>

        {/* Avvisi */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p><span className="font-bold">{t.disclaimerBoxTitle}: </span>{t.disclaimerBoxText}</p>
            {!listing.demo && !listing.verified && <p>{t.notVerifiedNote} {t.userAdNote}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-4 -mt-3">
          <button type="button" onClick={() => onReportAd(listing.id)} className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-600">
            <Flag className="w-3 h-3" />
            {t.reportAdBtn}
          </button>
          {listing.ownerId && listing.ownerId !== currentUser?.id && (
            <button type="button" onClick={() => onBlockUser(listing.ownerId)} className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-600">
              <UserX className="w-3 h-3" />
              {t.blockUser}
            </button>
          )}
        </div>

        {/* Recensioni */}
        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            {t.leaveFeedbackTitle}
          </h3>

          {listing.demo ? (
            <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6">{t.demoReviewDisabled}</p>
          ) : isOwner ? (
            <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6">{t.reviewOwnAd}</p>
          ) : alreadyReviewed ? (
            <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6">{t.reviewAlready}</p>
          ) : (
            <form onSubmit={submitReview} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">{t.yourRating}</span>
                  <div className="flex items-center gap-0.5" role="radiogroup" aria-label={t.yourRating}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        role="radio"
                        aria-checked={star === rating}
                        aria-label={`${star} / 5`}
                        onClick={() => setRating(star)}
                        className="p-1 hover:scale-110 transition"
                      >
                        <Star className={`w-5 h-5 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                {!currentUser && <span className="text-[11px] text-amber-700 font-semibold">{t.leaveReviewLoginHint}</span>}
              </div>

              <div>
                <span className="block text-[11px] font-bold text-slate-500 mb-1.5">{t.selectTags}</span>
                <div className="flex flex-wrap gap-1.5">
                  {tagLabels.map((label, idx) => {
                    const active = tags.includes(idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setTags((p) => (active ? p.filter((x) => x !== idx) : [...p, idx]))}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                          active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        + {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <textarea
                rows={3}
                value={comment}
                maxLength={600}
                onChange={(e) => setComment(e.target.value)}
                aria-label={t.commentPlaceholder}
                placeholder={t.commentPlaceholder}
                className="w-full p-3 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end">
                <button type="submit" disabled={sending} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-xs transition">
                  {t.submitReviewBtn}
                </button>
              </div>
            </form>
          )}

          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            {t.reviewsListTitle} ({listing.reviewsCount})
          </h4>
          {listing.reviews.length === 0 ? (
            <p className="text-sm text-slate-500">{t.noReviewsYet}</p>
          ) : (
            <div className="space-y-3">
              {listing.reviews.map((rev) => {
                const voted = myVotes.has(rev.id);
                return (
                  <div key={rev.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                          {rev.author.charAt(0)}
                        </div>
                        <span className="font-bold text-xs text-slate-900">{rev.author}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                          {rev.role === 'pro' ? t.rolePro : t.roleClient}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Stars value={rev.rating} />
                        <span>• {timeAgo(rev.createdAt, lang)}</span>
                      </div>
                    </div>

                    {rev.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {rev.tags.map((idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">✓ {tagLabels[idx]}</span>
                        ))}
                      </div>
                    )}

                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-3 break-words">{rev.comment}</p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <button
                        type="button"
                        onClick={() => onHelpful(listing.id, rev.id)}
                        disabled={voted}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold transition ${
                          voted ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        {t.helpfulBtn} ({rev.helpful || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => onReportReview(listing.id, rev.id)}
                        className="inline-flex items-center gap-1 hover:text-rose-600"
                      >
                        <Flag className="w-3 h-3" />
                        {t.reportReview}
                      </button>
                      {rev.userId && rev.userId !== currentUser?.id && (
                        <button
                          type="button"
                          onClick={() => onBlockUser(rev.userId)}
                          className="inline-flex items-center gap-1 hover:text-rose-600"
                        >
                          <UserX className="w-3 h-3" />
                          {t.blockUser}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
