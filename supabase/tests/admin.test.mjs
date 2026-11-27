import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// Prova schema.sql + admin.sql su un Postgres in memoria (PGlite) con estensioni simulate (stubs.sql).
// Uso: cd supabase/tests && npm install && npm test
const HERE = fileURLToPath(new URL('.', import.meta.url));
const P = fileURLToPath(new URL('..', import.meta.url));
const db = new PGlite();
const strip = (s) => s.replace(/^create extension.*$/gm, '-- (estensione simulata)');
let ok = 0, fail = 0;
const step = async (name, fn) => {
  try { const r = await fn(); ok++; console.log('OK ', name, r === undefined ? '' : JSON.stringify(r).slice(0, 260)); return r; }
  catch (e) { fail++; console.log('XX ', name, '->', e.message); }
};
const expectError = async (name, fn, re) => {
  try { await fn(); fail++; console.log('XX ', name, '-> nessun errore'); }
  catch (e) { if (re.test(e.message)) { ok++; console.log('OK ', name, '-> errore atteso:', e.message.slice(0, 120)); } else { fail++; console.log('XX ', name, '->', e.message); } }
};
const as = async (uid) => db.exec(`select set_config('request.jwt.claim.sub', '${uid || ''}', false)`);
const one = async (sql, params) => (await db.query(sql, params)).rows[0];
const val = async (sql, params) => Object.values(await one(sql, params))[0];

await db.exec(readFileSync(HERE + 'stubs.sql', 'utf8'));
await step('schema.sql', () => db.exec(readFileSync(P + 'schema.sql', 'utf8')));
await step('admin.sql (1)', () => db.exec(strip(readFileSync(P + 'admin.sql', 'utf8'))));
await step('admin.sql (rieseguito)', () => db.exec(strip(readFileSync(P + 'admin.sql', 'utf8'))));
await step('job cron unico', () => val(`select count(*)::int from cron.job where jobname = 'sospro24-hourly'`));

const admin = await val(`insert into auth.users (email, email_confirmed_at, raw_user_meta_data) values ('admin@test.it', now(), '{"name":"Admin Test","role":"pro","country":"IT","city":"Piacenza"}') returning id`);
const client = await val(`insert into auth.users (email, email_confirmed_at, raw_user_meta_data) values ('cliente@test.it', now(), '{"name":"Maria Rossi","role":"client","country":"IT","city":"Milano"}') returning id`);
await step('profili creati dal trigger', () => val(`select count(*)::int from public.profiles`));
await db.exec(`insert into private.admins (user_id) values ('${admin}')`);

await as(client);
await expectError('cliente NON puo usare il pannello', () => db.query(`select public.admin_dashboard()`), /Solo per amministratori/);
await step('is_admin() cliente = false', () => val(`select public.is_admin()`));
await as(admin);
await step('is_admin() admin = true', () => val(`select public.is_admin()`));

await expectError('chiave non prevista rifiutata', () => db.query(`select public.admin_set_secret('altro', 'x')`), /non prevista/);
await expectError('email senza chiave SendGrid', () => db.query(`select public.admin_send_email('a@b.it', 'Ciao', 'Testo lungo abbastanza')`), /Manca la chiave SendGrid/);
for (const [n, v] of [['sospro_sendgrid_key', 'SG.test'], ['sospro_telegram_token', '123:ABC'], ['sospro_service_key', 'sb_secret_test']]) {
  await step(`salva ${n}`, () => db.query(`select public.admin_set_secret($1, $2)`, [n, v]));
}
await expectError('chiave pubblica rifiutata', () => db.query(`select public.admin_set_secret('sospro_service_key', 'sb_publishable_abc')`), /PUBBLICA/);
await expectError('chiave SendGrid senza SG. rifiutata', () => db.query(`select public.admin_set_secret('sospro_sendgrid_key', 'xyz')`), /SG\./);
await step('aggiorna chiave esistente', () => db.query(`select public.admin_set_secret('sospro_sendgrid_key', '  SG.test2  ')`));
await step('chiave pulita dagli spazi', () => val(`select decrypted_secret from vault.decrypted_secrets where name = 'sospro_sendgrid_key'`));
await step('impostazioni', () => one(`select public.admin_get_settings() s`));
await step('aggiorna impostazioni (chiave estranea ignorata)', () => db.query(`select public.admin_update_settings('{"notify_review":"false","project_url":"https://evil"}')`));
await step('project_url invariato', () => val(`select private.setting('project_url')`));

await step('collega Telegram (ultima chat)', () => one(`select public.admin_telegram_link() r`));
await step('messaggio di conferma accodato', () => one(`select url, body->>'chat_id' chat, body->>'text' t from net.log order by id desc limit 1`));

const before = await val(`select count(*)::int from net.log`);
await step('nuovo annuncio (admin_save_listing)', async () => {
  const id = await val(`select public.admin_save_listing($1::jsonb)`, [JSON.stringify({ owner_id: admin, name: 'Admin Test', country: 'it', city: 'Piacenza', zone: '', category_id: 'home_sos', subcategory_id: 'plumber', title: 'Idraulico di prova', description: 'Descrizione di prova abbastanza lunga', hourly_rate: '40', call_out_fee: '', languages: ['Italiano'], skills: ['perdite'], sos_available: true, phone: '+39 333 1234567' })]);
  return { id, phone: await val(`select phone from public.listing_contacts where listing_id = $1`, [id]) };
});
const listing = await val(`select id from public.listings limit 1`);
await step('modifica annuncio', () => db.query(`select public.admin_save_listing($1::jsonb)`, [JSON.stringify({ id: listing, owner_id: admin, name: 'Admin Test', country: 'IT', city: 'Piacenza', zone: 'Centro', category_id: 'home_sos', subcategory_id: 'plumber', title: 'Idraulico modificato', description: 'Descrizione di prova abbastanza lunga', hourly_rate: 45, languages: [], skills: [] })]));
await as(client);
await step('richiesta del cliente', () => db.query(`insert into public.requests (country, city, category_id, subcategory_id, body, urgent) values ('IT','Milano','home_sos','plumber','Cerco un idraulico <subito> & presto', true)`));
await step('recensione (notifica disattivata)', () => db.query(`insert into public.reviews (listing_id, rating, comment) values ($1, 4, 'Bravo')`, [listing]));
await step('segnalazione', () => db.query(`insert into public.reports (listing_id, reason) values ($1, 'Numero errato')`, [listing]));
await as(admin);
await step('notifiche Telegram accodate (annuncio, richiesta, segnalazione = 3)', async () => (await val(`select count(*)::int from net.log`)) - before);
await step('HTML protetto nella notifica', () => val(`select body->>'text' from net.log where body->>'text' like '%richiesta%' order by id desc limit 1`));

await step('dashboard', () => one(`select public.admin_dashboard() d`));
await step('elenco utenti', async () => (await db.query(`select public.admin_list_users() u`)).rows.map((r) => [r.u.email, r.u.role, r.u.is_admin, r.u.listings, r.u.reported]));
await step('elenco annunci', async () => (await db.query(`select public.admin_list_listings() l`)).rows.map((r) => [r.l.title, r.l.phone, r.l.reports_open]));
await step('elenco segnalazioni', async () => (await db.query(`select public.admin_list_reports() r`)).rows.map((r) => r.r.listing?.title));
const report = await val(`select id from public.reports limit 1`);
await step('chiudi segnalazione', () => db.query(`select public.admin_resolve_report($1, 'nessuna violazione')`, [report]));
await step('elenco richieste', async () => (await db.query(`select public.admin_list_requests() r`)).rows.map((r) => [r.r.body, r.r.owner_email]));
await step('verifica annuncio', () => db.query(`select public.admin_set_listing($1, null, true)`, [listing]));

await step('email libera', () => one(`select public.admin_send_email('cliente@test.it', 'Ciao', 'Ciao Maria, questo e un test.', 'it', 'manual', $1) r`, [client]));
await step('richiesta a SendGrid corretta', async () => {
  const r = await one(`select headers, content from public.http_log where uri like '%sendgrid%' order by id desc limit 1`);
  const b = JSON.parse(r.content);
  return { from: b.from, reply: b.reply_to, unsub: b.headers['List-Unsubscribe'], auth: r.headers.includes('Bearer SG.test2'), plainEnd: b.content[0].value.slice(-90) };
});
await expectError('email non valida', () => db.query(`select public.admin_send_email('non-email', 'Ciao', 'Testo lungo abbastanza')`), /non valida/);
await db.exec(`insert into public.http_fail values ('%sendgrid%')`);
await step('errore SendGrid restituito', () => one(`select public.admin_send_email('x@test.it', 'Ciao', 'Testo lungo abbastanza') r`));
await step('benvenuto con SendGrid in errore: account creato, email_sent false', () => one(`select public.admin_create_user('fail@pro.it', 'Fail', 'pro', 'IT', null, 'it', true) r`));
await db.exec(`delete from public.http_fail`);
await step('errore registrato nel log', () => one(`select status, error from private.email_log where to_email = 'x@test.it'`));
await step('account fail creato comunque', () => val(`select count(*)::int from auth.users where email = 'fail@pro.it'`));

await step('importa contatti', () => one(`select public.admin_import_contacts($1::jsonb) r`, [JSON.stringify([
  { business_name: 'Ditta Uno', category: 'idraulici', city: 'Bari', email: 'Info@Uno.it', phone: '080 1' },
  { business_name: 'Ditta Uno', category: 'idraulici', city: 'Bari', email: 'altro@uno.it' },
  { business_name: 'Ditta Due', city: 'Bari', email: 'info@uno.it' },
  { business_name: 'Senza Email', city: 'Roma', email: 'non-valida' },
  { business_name: '', city: 'Roma' },
])]));
const contact = await val(`select id from private.contacts where business_name = 'Ditta Uno'`);
await step('invito al contatto -> stato invitato', async () => {
  await db.query(`select public.admin_send_email('info@uno.it', 'Invito', 'Buongiorno, invito di prova.', 'it', 'invite', null, $1)`, [contact]);
  return one(`select status, last_contacted is not null as contacted from private.contacts where id = $1`, [contact]);
});
await step('elenco contatti con conteggio email', async () => (await db.query(`select public.admin_list_contacts() c`)).rows.map((r) => [r.c.business_name, r.c.email, r.c.status, r.c.emails_sent]));

// Link personale dell'invito
const inv = await val(`select token from private.contacts where id = $1`, [contact]);
await step('token generato (18 caratteri esadecimali)', () => inv && /^[0-9a-f]{18}$/.test(inv));
const nTg = await val(`select count(*)::int from net.log`);
await as(null);
await db.exec(`update private.contacts set last_contacted = now() - interval '1 hour' where id = '${contact}'`);
await step('apertura anonima x2', async () => { await db.query(`select public.invite_open($1)`, [inv]); await db.query(`select public.invite_open($1)`, [inv]); });
await step('token inventato ignorato', () => db.exec(`select public.invite_open('ffffffffffffffffff'); select public.invite_open('<script>')`));
await as(admin);
await step('aperture contate, Telegram solo alla prima', async () => ({
  ...(await one(`select clicks, first_click is not null f, last_click is not null l from private.contacts where id = $1`, [contact])),
  telegram: (await val(`select count(*)::int from net.log`)) - nTg,
  testo: await val(`select body->>'text' from net.log order by id desc limit 1`),
}));
await step('apertura entro 3 min dall invio = antivirus (bot_clicks, niente Telegram)', async () => {
  const n0 = await val(`select count(*)::int from net.log`);
  await db.exec(`update private.contacts set last_contacted = now() where id = '${contact}'`);
  await as(null); await db.query(`select public.invite_open($1)`, [inv]); await as(admin);
  const r = await one(`select clicks, bot_clicks from private.contacts where id = $1`, [contact]);
  if (r.clicks !== 2 || r.bot_clicks !== 1) throw new Error(JSON.stringify(r));
  return { ...r, telegram: (await val(`select count(*)::int from net.log`)) - n0 };
});
await step('dashboard: contacts_opened', () => val(`select public.admin_dashboard() -> 'totals' ->> 'contacts_opened'`));
await step('elenco contatti con token e clicks', async () => (await db.query(`select public.admin_list_contacts() c`)).rows.map((r) => [r.c.business_name, r.c.clicks, !!r.c.token]));
await step('anon puo eseguire invite_open', async () => {
  await db.exec(`set role anon`);
  try { await db.query(`select public.invite_open('aaaaaaaaaaaaaaaaaa')`); return 'ok'; } finally { await db.exec('reset role'); }
});

// Anteprima e attivazione con un click
await db.query(`select public.admin_import_contacts($1::jsonb)`, [JSON.stringify([
  { business_name: 'Idraulica Bianchi', category: 'idraulici', city: 'Piacenza', email: 'bianchi@idraulica.it', phone: '0523 111222' },
  { business_name: 'Pulizie Rossi', category: 'imprese di pulizia', city: 'Parma', email: 'rossi@pulizie.it' },
])]);
const tB = await val(`select token from private.contacts where business_name = 'Idraulica Bianchi'`);
const tR = await val(`select token from private.contacts where business_name = 'Pulizie Rossi'`);
await as(null);
await step('anteprima (anonimo): bozza con categoria indovinata', () => one(`select public.preview_get($1) r`, [tB]));
await step('categoria pulizie -> care_person/cleaning', async () => (await one(`select public.preview_get($1) r`, [tR])).r.subcategory_id);
await expectError('attivazione senza accettare le Condizioni', () => db.query(`select public.preview_activate($1, '{"name":"Idraulica Bianchi","city":"Piacenza","title":"Idraulico","description":"Riparazioni e impianti","hourly_rate":"40","category_id":"home_sos","subcategory_id":"plumber"}')`, [tB]), /Condizioni/);
await expectError('attivazione senza tariffa', () => db.query(`select public.preview_activate($1, '{"accept":"true","name":"Idraulica Bianchi","city":"Piacenza","title":"Idraulico","description":"Riparazioni e impianti","hourly_rate":"","category_id":"home_sos","subcategory_id":"plumber"}')`, [tB]), /tariffa/);
await step('attivazione: account + annuncio + telefono + benvenuto', () => one(`select public.preview_activate($1, '{"accept":"true","name":"Idraulica Bianchi","city":"Piacenza","zone":"Centro","title":"Idraulico a Piacenza","description":"Riparazioni, perdite e impianti idraulici","hourly_rate":"40,50","phone":"0523 111222","category_id":"home_sos","subcategory_id":"plumber","sos":true}') r`, [tB]));
await step('annuncio creato correttamente', () => one(`select l.title, l.hourly_rate, l.sos_available, l.languages, c.phone, l.status from public.listings l join public.listing_contacts c on c.listing_id = l.id where l.title = 'Idraulico a Piacenza'`));
await expectError('seconda attivazione rifiutata', () => db.query(`select public.preview_activate($1, '{"accept":"true"}')`, [tB]), /già stato attivato/);
await step('anteprima dopo attivazione = active', async () => (await one(`select public.preview_get($1) r`, [tB])).r.status);
await step('non mi interessa', () => val(`select public.preview_decline($1)`, [tR]));
await step('dopo il rifiuto: declined + niente email', async () => ({ get: (await one(`select public.preview_get($1) r`, [tR])).r.status, optout: await val(`select count(*)::int from private.email_optout where email = 'rossi@pulizie.it'`) }));
await expectError('anteprima con token inventato', () => db.query(`select public.preview_get('ffffffffffffffffff')`), /non valido/);
await as(admin);
await step('contatto segnato pubblicato', () => one(`select status, user_id is not null as account from private.contacts where business_name = 'Idraulica Bianchi'`));

const token = await val(`select private.unsub_token('info@uno.it')`);
await as(null);
await step('disiscrizione con token sbagliato = false', () => val(`select public.email_unsubscribe('info@uno.it', 'sbagliato')`));
await step('disiscrizione con token giusto (anonimo)', () => val(`select public.email_unsubscribe('INFO@uno.it', $1)`, [token]));
await as(admin);
await step('contatto segnato disiscritto', () => val(`select status from private.contacts where id = $1`, [contact]));
await expectError('nessuna email ai disiscritti', () => db.query(`select public.admin_send_email('info@uno.it', 'Ciao', 'Testo lungo abbastanza')`), /disiscritto/);

await step('crea account + benvenuto', () => one(`select public.admin_create_user('nuovo@pro.it', 'Mario Bianchi', 'pro', 'IT', 'Bari', 'it', true, $1) r`, [contact]));
await step('chiave sb_secret: solo apikey, niente Bearer', async () => {
  const h = await val(`select headers from public.http_log where uri like '%/auth/v1/admin/users' order by id desc limit 1`);
  if (!h.includes('apikey') || h.includes('Bearer')) throw new Error('intestazioni sbagliate: ' + h);
  return h;
});
await step('email di benvenuto con link', () => val(`select body from private.email_log where kind = 'welcome' limit 1`));
const wtok = await val(`select token from private.welcome_tokens order by created_at desc limit 1`);
await step('email benvenuto contiene la pagina benvenuto.html (non il link Supabase)', async () => {
  const b = await val(`select body from private.email_log where kind = 'welcome' and status = 'sent' order by created_at desc limit 1`);
  if (!b.includes('/benvenuto.html?t=' + wtok) || b.includes('/auth/v1/verify')) throw new Error(b);
  return 'ok';
});
await as(null);
await step('welcome_start anonimo -> link Supabase', () => val(`select public.welcome_start($1)`, [wtok]));
await expectError('welcome_start con codice inventato', () => db.query(`select public.welcome_start('${'0'.repeat(32)}')`), /non valido/);
await db.exec(`update private.welcome_tokens set expires_at = now() - interval '1 day' where token = '${wtok}'`);
await expectError('welcome_start scaduto', () => db.query(`select public.welcome_start($1)`, [wtok]), /scaduto/);
await as(admin);
await step('conferma email a mano (admin)', async () => {
  const uid = await val(`select id from auth.users where email = 'cliente@test.it'`);
  await db.query(`select public.admin_confirm_email($1)`, [uid]);
  const h = await val(`select content from public.http_log where uri like '%/admin/users/' || $1::text order by id desc limit 1`, [uid]);
  if (!h.includes('email_confirm')) throw new Error(h);
  return h;
});
await step('reinvia benvenuto', async () => {
  const uid = await val(`select user_id from private.welcome_tokens where token = $1`, [wtok]);
  return one(`select public.admin_send_welcome($1) r`, [uid]);
});
await step('anon puo eseguire welcome_start, non admin_send_welcome', async () => {
  await db.exec(`set role anon`);
  try {
    let a = 'no'; try { await db.query(`select public.admin_send_welcome(gen_random_uuid())`); a = 'SI (errore)'; } catch (e) { a = e.message.includes('permission') ? 'negato' : e.message; }
    let b = 'no'; try { await db.query(`select public.welcome_start('${'0'.repeat(32)}')`); } catch (e) { b = e.message.includes('permission') ? 'NEGATO (errore)' : 'eseguibile'; }
    return { admin_send_welcome: a, welcome_start: b };
  } finally { await db.exec('reset role'); }
});
await expectError('account doppio rifiutato', () => db.query(`select public.admin_create_user('NUOVO@pro.it', 'X')`), /Esiste/);
const newUser = await val(`select id from auth.users where email = 'nuovo@pro.it'`);
await step('profilo del nuovo account', () => one(`select name, role, country, city from public.profiles where id = $1`, [newUser]));
await step('modifica account (nome, citta, email)', async () => {
  await db.query(`select public.admin_update_user($1, '{"name":"Mario B.","city":"Lecce","email":"mario@pro.it"}')`, [newUser]);
  return one(`select p.name, p.city, u.email from public.profiles p join auth.users u on u.id = p.id where p.id = $1`, [newUser]);
});
await db.exec(`insert into public.listings (owner_id, name, country, city, zone, category_id, subcategory_id, title, description, hourly_rate) values ('${newUser}', 'Mario', 'IT', 'Bari', 'Centro', 'home_sos', 'plumber', 'Titolo', 'Descrizione lunga', 30)`);
await step('blocca account -> annunci nascosti', async () => {
  await db.query(`select public.admin_set_banned($1, true, 'spam')`, [newUser]);
  return one(`select (select banned_until is not null from auth.users where id = $1) banned, (select status from public.listings where owner_id = $1) listing`, [newUser]);
});
await step('sblocca -> annunci riattivati', async () => {
  await db.query(`select public.admin_set_banned($1, false)`, [newUser]);
  return one(`select (select banned_until is null from auth.users where id = $1) free, (select status from public.listings where owner_id = $1) listing`, [newUser]);
});
await expectError('non puoi bloccare te stesso', () => db.query(`select public.admin_set_banned($1, true)`, [admin]), /tuo account/);
await step('elimina account (a cascata)', async () => {
  await db.query(`select public.admin_delete_user($1, 'violazione')`, [newUser]);
  return one(`select (select count(*)::int from auth.users where id = $1) u, (select count(*)::int from public.listings where owner_id = $1) l, (select count(*)::int from public.profiles where id = $1) p`, [newUser]);
});

await step('riepilogo di oggi', () => val(`select public.admin_send_summary(true)`));
await step('job orario: invia una sola volta', async () => {
  await db.exec(`update private.settings set value = '0' where key = 'daily_summary_hour'; update private.settings set value = '' where key = 'daily_summary_last';`);
  const n0 = await val(`select count(*)::int from net.log`);
  await db.exec(`select private.hourly_job(); select private.hourly_job();`);
  return (await val(`select count(*)::int from net.log`)) - n0;
});
await step('log email', async () => (await db.query(`select public.admin_email_log(10) e`)).rows.map((r) => [r.e.to_email, r.e.kind, r.e.status, 'sent_by' in r.e]));

await step('anon non puo eseguire admin_dashboard', async () => {
  await db.exec(`grant usage on schema public to anon, authenticated; set role anon`);
  try { await db.query(`select public.admin_dashboard()`); return 'ERRORE: permesso concesso'; }
  catch (e) { return e.message; } finally { await db.exec('reset role'); }
});
await step('anon puo eseguire email_unsubscribe', async () => {
  await db.exec(`set role anon`);
  try { return await val(`select public.email_unsubscribe('z@z.it', 'x')`); } finally { await db.exec('reset role'); }
});
await step('authenticated non legge private.contacts', async () => {
  await db.exec(`set role authenticated`);
  try { await db.query(`select * from private.contacts`); return 'ERRORE: leggibile'; }
  catch (e) { return e.message; } finally { await db.exec('reset role'); }
});

// Rete instabile: la prima chiamata scade, la seconda riesce
await db.exec(`create sequence public.flaky;
create or replace function extensions.http(r extensions.http_request) returns extensions.http_response language plpgsql as $f$
begin
  if r.uri like '%flaky-once%' then
    if nextval('public.flaky') = 1 then raise exception 'Connection timed out after 8002 milliseconds'; end if;
    return row(200, 'application/json', null, '{"ok":true}')::extensions.http_response;
  end if;
  raise exception 'Connection timed out after 8002 milliseconds';
end $f$;`);
await step('secondo tentativo dopo timeout', () => one(`select private.http_json('GET', 'https://x/flaky-once', null, null) r`));
await expectError('due timeout -> messaggio chiaro', () => db.query(`select private.http_json('GET', 'https://x/sempre-giu', null, null)`), /Collegamento non riuscito/);

console.log(`\n${ok} ok, ${fail} falliti`);
