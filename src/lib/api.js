// Tutte le chiamate al database passano da qui.
// La sicurezza vera è nel database (Row Level Security in supabase/schema.sql):
// questi controlli lato app servono solo a dare messaggi chiari all'utente.
import { supabase } from './supabase';
import { LANGUAGES } from '../data';

const LISTING_COLUMNS =
  'id, owner_id, name, country, city, zone, category_id, subcategory_id, title, description, hourly_rate, call_out_fee, currency, languages, skills, sos_available, verified, status, created_at, reviews(id, author_id, author_name, author_role, rating, tags, comment, helpful_count, created_at)';

const sameInAllLanguages = (text) => Object.fromEntries(LANGUAGES.map((l) => [l.code, text]));

// Riga del database -> formato usato dai componenti
export function mapListing(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    demo: false,
    verified: row.verified,
    status: row.status,
    createdAt: row.created_at,
    name: row.name,
    country: row.country,
    city: row.city,
    zone: row.zone,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id,
    sosAvailable: row.sos_available,
    responseTimeMin: null,
    hourlyRate: Number(row.hourly_rate),
    callOutFee: Number(row.call_out_fee),
    currency: row.currency,
    experienceYears: null,
    languages: row.languages || [],
    skills: row.skills || [],
    titles: sameInAllLanguages(row.title),
    descriptions: sameInAllLanguages(row.description),
    reviews: (row.reviews || []).map((r) => ({
      id: r.id,
      userId: r.author_id,
      author: r.author_name,
      role: r.author_role,
      rating: r.rating,
      tags: r.tags || [],
      comment: r.comment,
      helpful: r.helpful_count,
      createdAt: r.created_at,
    })),
  };
}

const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};

/* ------------------------------ Annunci ------------------------------ */
export async function fetchListings() {
  const rows = must(
    await supabase.from('listings').select(LISTING_COLUMNS).eq('status', 'active').order('created_at', { ascending: false }).limit(500)
  );
  return rows.map(mapListing);
}

export async function fetchMyListings(userId) {
  const rows = must(await supabase.from('listings').select(LISTING_COLUMNS).eq('owner_id', userId));
  return rows.map(mapListing);
}

export async function fetchContact(listingId) {
  const data = must(await supabase.from('listing_contacts').select('phone').eq('listing_id', listingId).maybeSingle());
  return data?.phone || null;
}

export async function createListing(form) {
  const split = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
  const created = must(
    await supabase
      .from('listings')
      .insert({
        name: form.name.trim(),
        country: form.country,
        city: form.city,
        zone: form.zone,
        category_id: form.categoryId,
        subcategory_id: form.subcategoryId,
        title: form.title.trim(),
        description: form.description.trim(),
        hourly_rate: Math.max(1, Number(form.hourlyRate) || 1),
        call_out_fee: Math.max(0, Number(form.callOutFee) || 0),
        currency: form.currency,
        languages: split(form.languages).slice(0, 10),
        skills: split(form.skills).slice(0, 12),
        sos_available: form.sosAvailable,
      })
      .select('id')
      .single()
  );
  const { error } = await supabase.from('listing_contacts').insert({ listing_id: created.id, phone: form.phone.trim() });
  if (error) {
    // Senza telefono l'annuncio non serve: lo togliamo per non lasciarlo a metà
    await supabase.from('listings').delete().eq('id', created.id);
    throw error;
  }
  return created.id;
}

export async function deleteListing(id) {
  must(await supabase.from('listings').delete().eq('id', id));
}

/* ------------------------------ Recensioni ------------------------------ */
export async function addReview(listingId, { rating, tags, comment }) {
  must(await supabase.from('reviews').insert({ listing_id: listingId, rating, tags, comment: comment.trim() }));
}

export async function fetchMyVotes() {
  const rows = must(await supabase.from('review_votes').select('review_id'));
  return new Set(rows.map((r) => r.review_id));
}

export async function voteHelpful(reviewId) {
  const { error } = await supabase.from('review_votes').insert({ review_id: reviewId });
  if (error && error.code !== '23505') throw error; // 23505 = voto già dato
}

/* ------------------------------ Segnalazioni ------------------------------ */
export async function report({ listingId = null, reviewId = null, reason = null }) {
  must(await supabase.from('reports').insert({ listing_id: listingId, review_id: reviewId, reason }));
}

/* ------------------------------ Lista d'attesa ------------------------------ */
export async function joinWaitlist({ email, country, city, categoryId, lang }) {
  const { error } = await supabase
    .from('waitlist')
    .insert({ email: email.trim().toLowerCase(), country, city: city || '', category_id: categoryId || '', lang });
  if (error && error.code !== '23505') throw error; // già iscritto = ok
}

export async function waitlistCount({ country, city, categoryId }) {
  const data = must(
    await supabase.rpc('waitlist_count', {
      p_country: country,
      p_city: city || null,
      p_category: categoryId || null,
    })
  );
  return data || 0;
}

/* ------------------------------ Account ------------------------------ */
export async function signUp({ email, password, name, role, country, city, lang }) {
  return must(
    await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // "lang" serve ai modelli email di Supabase per scrivere nella lingua dell'utente
        data: { name: name.trim(), role, country, city: city.trim(), lang },
        emailRedirectTo: window.location.origin,
      },
    })
  );
}

export async function signIn({ email, password }) {
  return must(await supabase.auth.signInWithPassword({ email: email.trim(), password }));
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function sendPasswordReset(email) {
  must(await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin }));
}

export async function updatePassword(password) {
  must(await supabase.auth.updateUser({ password }));
}

export async function fetchProfile(userId) {
  return must(await supabase.from('profiles').select('id, name, role, country, city').eq('id', userId).maybeSingle());
}

export async function updateProfile(userId, patch) {
  must(await supabase.from('profiles').update(patch).eq('id', userId));
}

/* ------------------------------ Errori leggibili ------------------------------ */
// Restituisce la chiave di testo (in UI_TEXT) adatta all'errore
export function authErrorKey(error) {
  const code = error?.code || '';
  const msg = String(error?.message || '').toLowerCase();
  if (code === 'invalid_credentials' || msg.includes('invalid login')) return 'authErrorInvalid';
  if (code === 'user_already_exists' || msg.includes('already registered')) return 'authErrorExists';
  if (code === 'weak_password' || msg.includes('password should')) return 'authErrorWeak';
  if (code === 'email_not_confirmed' || msg.includes('not confirmed')) return 'authErrorNotConfirmed';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || msg.includes('rate limit')) return 'authErrorRate';
  return 'authErrorGeneric';
}
