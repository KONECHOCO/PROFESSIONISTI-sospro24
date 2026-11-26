// Chiamate del pannello amministratore. Ogni funzione admin_* nel database
// (supabase/admin.sql) controlla da sola che chi chiama sia amministratore:
// qui non c'è nessun segreto e nessun controllo di sicurezza "vero".
import { supabase } from '../lib/supabase';

// Solo in sviluppo: admin.html?mock usa dati finti (src/admin/mock.js), mai in produzione
export const MOCK = import.meta.env.DEV && new URLSearchParams(window.location.search).has('mock');

async function rpc(name, args = {}) {
  if (import.meta.env.DEV && MOCK) return (await import('./mock')).default(name, args);
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message || String(error));
  return data;
}

export const isAdmin = () => rpc('is_admin');
export const dashboard = () => rpc('admin_dashboard');

export const listUsers = () => rpc('admin_list_users');
export const updateUser = (id, p) => rpc('admin_update_user', { p_id: id, p });
export const createUser = (u) => rpc('admin_create_user', {
  p_email: u.email, p_name: u.name, p_role: u.role, p_country: u.country, p_city: u.city || null,
  p_lang: u.lang, p_welcome: u.welcome, p_contact: u.contactId || null,
});
export const sendWelcome = async (id) => {
  const r = await rpc('admin_send_welcome', { p_user: id });
  if (r && r.ok === false) throw new Error(r.error || 'Invio non riuscito');
  return r;
};
export const confirmEmail = (id) => rpc('admin_confirm_email', { p_id: id });
export const setBanned = (id, banned, reason) => rpc('admin_set_banned', { p_id: id, p_banned: banned, p_reason: reason || null });
export const deleteUser = (id, reason) => rpc('admin_delete_user', { p_id: id, p_reason: reason || null });

export const listListings = () => rpc('admin_list_listings');
export const setListing = (id, status, verified) => rpc('admin_set_listing', { p_id: id, p_status: status ?? null, p_verified: verified ?? null });
export const saveListing = (p) => rpc('admin_save_listing', { p });
export const deleteListing = (id) => rpc('admin_delete_listing', { p_id: id });

export const listRequests = () => rpc('admin_list_requests');
export const setRequest = (id, status) => rpc('admin_set_request', { p_id: id, p_status: status });

export const listReports = () => rpc('admin_list_reports');
export const resolveReport = (id, resolution) => rpc('admin_resolve_report', { p_id: id, p_resolution: resolution });
export const deleteReview = (id) => rpc('admin_delete_review', { p_id: id });

export const listWaitlist = () => rpc('admin_list_waitlist');

// Il database registra anche gli invii falliti e risponde { ok: false, error }: qui diventa un errore
export const sendEmail = async (m) => {
  const r = await rpc('admin_send_email', {
    p_to: m.to, p_subject: m.subject, p_text: m.text, p_lang: m.lang || 'it', p_kind: m.kind || 'manual',
    p_user: m.userId || null, p_contact: m.contactId || null,
  });
  if (r && r.ok === false) throw new Error(r.error || 'Invio non riuscito');
  return r;
};
export const emailLog = (limit = 200) => rpc('admin_email_log', { p_limit: limit });

export const listContacts = () => rpc('admin_list_contacts');
export const importContacts = (rows) => rpc('admin_import_contacts', { p_rows: rows });
export const updateContact = (id, p) => rpc('admin_update_contact', { p_id: id, p });
export const deleteContact = (id) => rpc('admin_delete_contact', { p_id: id });

export const getSettings = () => rpc('admin_get_settings');
export const updateSettings = (p) => rpc('admin_update_settings', { p });
export const setSecret = (name, value) => rpc('admin_set_secret', { p_name: name, p_value: value });
export const telegramLink = () => rpc('admin_telegram_link');
export const sendSummary = (today) => rpc('admin_send_summary', { p_today: today });
