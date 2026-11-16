import { useEffect, useState } from 'react';
import { COUNTRIES, CATEGORIES, FEEDBACK_TAGS } from '../data';

/* ---------- Storage sicuro (non esplode in navigazione privata) ---------- */
export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota piena o storage bloccato: l'app continua a funzionare senza salvare */
  }
}

export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => loadJSON(key, initial));
  useEffect(() => saveJSON(key, value), [key, value]);
  return [value, setValue];
}

/* ---------- Testi ---------- */
export const fmt = (str, vars = {}) =>
  String(str).replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''));

export const pick = (obj, lang) => (obj && (obj[lang] || obj.it)) || '';

export const countryName = (code, lang) => {
  const c = COUNTRIES.find((x) => x.code === code);
  return c ? `${c.flag} ${pick(c.names, lang)}` : code;
};

export const categoryName = (catId, lang) => {
  const c = CATEGORIES.find((x) => x.id === catId);
  return c ? pick(c.names, lang) : catId;
};

export const subcategoryName = (catId, subId, lang) => {
  const c = CATEGORIES.find((x) => x.id === catId);
  const s = c?.subcategories.find((x) => x.id === subId);
  return s ? pick(s.names, lang) : subId;
};

export const currencyOf = (countryCode) => COUNTRIES.find((c) => c.code === countryCode)?.currency || '€';

/* ---------- Città e zone: tassonomia + valori reali presenti negli annunci ---------- */
export function getCityOptions(countryCode, listings) {
  const fromTaxonomy = (
    countryCode === 'ALL' ? COUNTRIES.flatMap((c) => c.cities) : COUNTRIES.find((c) => c.code === countryCode)?.cities || []
  ).map((c) => c.id);
  const fromListings = listings
    .filter((l) => countryCode === 'ALL' || l.country === countryCode)
    .map((l) => l.city);
  return [...new Set([...fromTaxonomy, ...fromListings])].sort((a, b) => a.localeCompare(b));
}

export function getZoneOptions(cityId, listings) {
  if (!cityId || cityId === 'ALL') return [];
  const fromTaxonomy = COUNTRIES.flatMap((c) => c.cities).find((c) => c.id === cityId)?.zones || [];
  const fromListings = listings.filter((l) => l.city === cityId).map((l) => l.zone);
  return [...new Set([...fromTaxonomy, ...fromListings])];
}

/* ---------- Date relative localizzate ---------- */
export function timeAgo(iso, lang) {
  const diffSec = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  if (abs < 60) return rtf.format(0, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 86400 * 7) return rtf.format(Math.round(diffSec / 86400), 'day');
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / (86400 * 7)), 'week');
  if (abs < 86400 * 365) return rtf.format(Math.round(diffSec / (86400 * 30)), 'month');
  return rtf.format(Math.round(diffSec / (86400 * 365)), 'year');
}

/* ---------- Telefono ---------- */
export const phoneDigits = (phone) => String(phone || '').replace(/[^\d]/g, '');

export function isValidPhone(phone) {
  const p = String(phone || '').trim();
  const digits = phoneDigits(p);
  return /^\+?[\d\s().-]+$/.test(p) && digits.length >= 8 && digits.length <= 15;
}

// Converte un numero in formato internazionale per tel: e wa.me (aggiunge solo cifre, mantiene il +)
export const telHref = (phone) => `tel:${String(phone).trim().startsWith('+') ? '+' : ''}${phoneDigits(phone)}`;
export const whatsappHref = (phone, text = '') =>
  `https://wa.me/${phoneDigits(phone)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

/* ---------- Annunci: statistiche SEMPRE calcolate dalle recensioni reali ---------- */
const TAG_INDEX_IT = FEEDBACK_TAGS.it;

function normalizeReview(r) {
  return {
    ...r,
    role: r.role === 'pro' ? 'pro' : 'client',
    createdAt: r.createdAt || new Date(Date.now() - (r.daysAgo || 0) * 86400000).toISOString(),
    // I tag sono salvati come indici, così si traducono in ogni lingua
    tags: (r.tags || [])
      .map((t) => (typeof t === 'number' ? t : TAG_INDEX_IT.indexOf(t)))
      .filter((i) => i >= 0),
  };
}

export function normalizeListing(listing, extraReviews = []) {
  const reviews = [...extraReviews, ...(listing.reviews || [])]
    .map(normalizeReview)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const reviewsCount = reviews.length;
  const rating = reviewsCount ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviewsCount) * 10) / 10 : null;
  return { ...listing, reviews, reviewsCount, rating, skills: listing.skills || [], languages: listing.languages || [] };
}
