// SOLO SVILUPPO: http://localhost:5173/admin.html?mock — dati finti per provare il pannello
// senza database. Non entra nella build pubblicata (import.meta.env.DEV è falso).
const now = Date.now();
const ago = (h) => new Date(now - h * 3600e3).toISOString();

const users = [
  { id: 'u1', email: 'admin@example.com', name: 'Amministratore', role: 'pro', country: 'IT', city: 'Piacenza', confirmed: true, banned: false, is_admin: true, listings: 1, requests: 0, reviews: 0, reported: 0, opted_out: false, created_at: ago(400), last_sign_in_at: ago(1), lang: 'it' },
  { id: 'u2', email: 'idraulico.esempio@example.com', name: 'Idraulico Esempio', role: 'pro', country: 'IT', city: 'Milano', confirmed: true, banned: false, is_admin: false, listings: 1, requests: 0, reviews: 0, reported: 1, opted_out: false, created_at: ago(30), last_sign_in_at: ago(5), lang: 'it' },
  { id: 'u3', email: 'cliente.esempio@example.com', name: 'Cliente Esempio', role: 'client', country: 'FR', city: 'Paris', confirmed: false, banned: false, is_admin: false, listings: 0, requests: 1, reviews: 1, reported: 0, opted_out: false, created_at: ago(3), last_sign_in_at: null, lang: 'fr' },
];
const listings = [
  { id: 'l1', owner_id: 'u2', owner_email: 'idraulico.esempio@example.com', name: 'Idraulico Esempio', title: 'Idraulico pronto intervento (esempio)', description: 'Annuncio di prova per il pannello.', country: 'IT', city: 'Milano', zone: 'Centro Storico', category_id: 'home_sos', subcategory_id: 'plumber', hourly_rate: 40, call_out_fee: 20, currency: '€', languages: ['Italiano'], skills: ['perdite'], sos_available: true, verified: false, status: 'active', phone: '+39 000 000 0000', reviews_count: 1, reports_open: 1, created_at: ago(28) },
];
const requests = [
  { id: 'r1', owner_id: 'u3', owner_email: 'cliente.esempio@example.com', author_name: 'Cliente E.', body: 'Cerco un idraulico per una perdita (esempio)', country: 'FR', city: 'Paris', zone: '', category_id: 'home_sos', urgent: true, status: 'active', phone: '+33 0 00 00 00 00', created_at: ago(2), expires_at: new Date(now + 28 * 86400e3).toISOString() },
];
const reports = [
  { id: 'p1', created_at: ago(4), reason: 'Numero non risponde (esempio)', resolved_at: null, reporter_email: 'cliente.esempio@example.com', listing: { id: 'l1', title: listings[0].title, name: 'Idraulico Esempio', status: 'active', owner_id: 'u2', owner_email: listings[0].owner_email } },
];
const contacts = [
  { id: 'c1', business_name: 'Ditta Esempio Srl', category: 'idraulici', city: 'Bologna', country: 'IT', email: 'info@example.com', phone: '051 000000', website: 'https://example.com', source: 'https://example.com', notes: '', lang: 'it', status: 'new', emails_sent: 0, token: 'aaaaaaaaaaaaaaaaaa', clicks: 0, created_at: ago(1) },
  { id: 'c2', business_name: 'Elettricista Esempio', category: 'elettricisti', city: 'Napoli', country: 'IT', email: 'contatto@example.org', phone: '', website: '', source: '', notes: 'Ha risposto: vuole il profilo', lang: 'it', status: 'replied', emails_sent: 1, last_contacted: ago(20), token: 'bbbbbbbbbbbbbbbbbb', clicks: 2, first_click: ago(19), last_click: ago(3), created_at: ago(48) },
];
const zero = { users: 0, pros: 0, listings: 0, requests: 0, reviews: 0, reports: 0, waitlist: 0, emails: 0 };
const settings = { mail_from: 'supporto@ikonetsolutions.com', mail_from_name: 'SOSPro24', mail_reply_to: 'supporto@sospro24.com', mail_daily_limit: '300', telegram_chat_id: '', notify_signup: 'true', notify_listing: 'true', notify_request: 'true', notify_report: 'true', notify_review: 'true', notify_waitlist: 'false', daily_summary_hour: '8', has_sendgrid: false, has_telegram: false, has_service: false, has_cron: true };

export default async function mockRpc(name, args) {
  await new Promise((r) => setTimeout(r, 150));
  switch (name) {
    case 'is_admin': return true;
    case 'admin_dashboard': return {
      totals: { users: 3, pros: 2, clients: 1, listings_active: 1, listings_all: 1, requests_active: 1, reports_open: 1, waitlist: 2, reviews: 1, contacts: 2, contacts_invited: 1, contacts_opened: 1, unconfirmed: 1 },
      today: { ...zero, users: 1, requests: 1 }, yesterday: { ...zero, listings: 1 }, week: { ...zero, users: 2, pros: 1, listings: 1, requests: 1, reports: 1 },
      by_country: { IT: 1 },
      daily: Array.from({ length: 30 }, (_, i) => ({ day: new Date(now - (29 - i) * 86400e3).toISOString().slice(0, 10), users: i % 7 === 0 ? 1 : 0, listings: i === 27 ? 1 : 0, requests: i === 29 ? 1 : 0 })),
    };
    case 'admin_list_users': return users;
    case 'admin_list_listings': return listings;
    case 'admin_list_requests': return requests;
    case 'admin_list_reports': return reports;
    case 'admin_list_contacts': return contacts;
    case 'admin_list_waitlist': return [{ id: 'w1', email: 'attesa@example.com', country: 'ES', city: 'Madrid', category_id: 'home_sos', created_at: ago(10) }];
    case 'admin_email_log': return [{ id: 'e1', to_email: 'contatto@example.org', subject: 'Un annuncio gratuito su SOSPro24 (esempio)', body: 'Testo di esempio', kind: 'invite', status: 'sent', created_at: ago(20) }];
    case 'admin_get_settings': return settings;
    case 'admin_import_contacts': return { added: args.p_rows.length, skipped: 0 };
    case 'admin_send_email': if (String(args.p_to).includes('fail')) throw new Error('SendGrid 403: esempio di errore'); return { ok: true };
    case 'admin_create_user': return { id: 'u9', email_sent: args.p_welcome };
    default: return null;
  }
}
