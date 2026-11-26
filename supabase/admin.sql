-- =====================================================================
-- SOSPro24 — pannello amministratore (sospro24.com/admin.html)
-- Come usarlo: Supabase → SQL Editor → New query → incolla tutto → Run.
-- Va eseguito DOPO schema.sql. Si può rieseguire.
--
-- Cosa aggiunge:
--   • chi è amministratore (tabella private.admins, mai leggibile dall'app)
--   • funzioni admin_* chiamate dal pannello: ognuna controlla per prima cosa
--     che chi chiama sia amministratore
--   • email con SendGrid (chiave nel Vault di Supabase), registro invii,
--     disiscrizione con un click, contatti da invitare
--   • notifiche Telegram in tempo reale + riepilogo ogni mattina (pg_cron)
--
-- Le chiavi (SendGrid, Telegram, chiave di servizio Supabase) NON stanno in
-- questo file: si incollano nel pannello → Impostazioni e finiscono cifrate
-- nel Vault.
--
-- Dopo il primo Run, rendi amministratore il tuo account (una volta sola):
--   insert into private.admins (user_id)
--   select id from auth.users where email = 'LA-TUA-EMAIL' on conflict do nothing;
-- =====================================================================

create extension if not exists pg_net with schema extensions;
create extension if not exists http with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pgcrypto with schema extensions;

-- Schema non esposto dalle API di Supabase: qui stanno dati e funzioni interne
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- AMMINISTRATORI
-- ---------------------------------------------------------------------
create table if not exists private.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.admins where user_id = auth.uid());
$$;

create or replace function private.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from private.admins where user_id = auth.uid()) then
    raise exception 'Solo per amministratori' using errcode = '42501';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- IMPOSTAZIONI (non segrete) e CHIAVI (nel Vault)
-- ---------------------------------------------------------------------
create table if not exists private.settings (
  key   text primary key,
  value text not null default ''
);

insert into private.settings (key, value) values
  ('project_url',        'https://qpwdczbhazahlytvpdrb.supabase.co'),
  ('site_url',           'https://sospro24.com'),
  ('mail_from',          'supporto@ikonetsolutions.com'),
  ('mail_from_name',     'SOSPro24'),
  ('mail_reply_to',      'supporto@sospro24.com'),
  ('mail_daily_limit',   '300'),
  ('telegram_chat_id',   ''),
  ('notify_signup',      'true'),
  ('notify_listing',     'true'),
  ('notify_request',     'true'),
  ('notify_report',      'true'),
  ('notify_review',      'true'),
  ('notify_waitlist',    'false'),
  ('daily_summary_hour', '8'),
  ('daily_summary_last', '')
on conflict (key) do nothing;

create or replace function private.setting(p_key text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select value from private.settings where key = p_key), '');
$$;

create or replace function private.secret(p_name text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_name limit 1;
$$;

-- Chiave usata per firmare i link di disiscrizione (generata una volta, mai mostrata)
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'sospro_unsub_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'sospro_unsub_key', 'Firma dei link di disiscrizione');
  end if;
end;
$$;

-- Le chiavi che il pannello può impostare (si possono scrivere ma mai rileggere)
create or replace function public.admin_set_secret(p_name text, p_value text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.require_admin();
  if p_name not in ('sospro_sendgrid_key', 'sospro_telegram_token', 'sospro_service_key') then
    raise exception 'Chiave non prevista';
  end if;
  p_value := btrim(coalesce(p_value, ''), E' \t\r\n');
  if p_value = '' then
    raise exception 'Valore vuoto';
  end if;
  -- Errori frequenti: chiave pubblica al posto di quella segreta
  if p_name = 'sospro_service_key' and (p_value like 'sb\_publishable\_%' or p_value like 'sb\_anon%') then
    raise exception 'Questa è la chiave PUBBLICA (publishable): serve la chiave SEGRETA che inizia con sb_secret_ (Supabase → Project Settings → API Keys → Secret keys)';
  end if;
  if p_name = 'sospro_service_key' and p_value not like 'sb\_secret\_%' and p_value not like 'eyJ%' then
    raise exception 'Chiave non riconosciuta: deve iniziare con sb_secret_ (oppure essere la vecchia service_role eyJ…)';
  end if;
  if p_name = 'sospro_sendgrid_key' and p_value not like 'SG.%' then
    raise exception 'La chiave SendGrid deve iniziare con SG.';
  end if;
  select id into v_id from vault.secrets where name = p_name;
  if v_id is null then
    perform vault.create_secret(p_value, p_name);
  else
    perform vault.update_secret(v_id, p_value);
  end if;
end;
$$;

create or replace function public.admin_get_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return (select jsonb_object_agg(key, value) from private.settings)
    || jsonb_build_object(
      'has_sendgrid', exists (select 1 from vault.secrets where name = 'sospro_sendgrid_key'),
      'has_telegram', exists (select 1 from vault.secrets where name = 'sospro_telegram_token'),
      'has_service',  exists (select 1 from vault.secrets where name = 'sospro_service_key'),
      'has_cron',     exists (select 1 from cron.job where jobname = 'sospro24-hourly')
    );
end;
$$;

create or replace function public.admin_update_settings(p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  k text;
begin
  perform private.require_admin();
  for k in select jsonb_object_keys(p) loop
    if k in ('mail_from', 'mail_from_name', 'mail_reply_to', 'mail_daily_limit', 'notify_signup', 'notify_listing',
             'notify_request', 'notify_report', 'notify_review', 'notify_waitlist', 'daily_summary_hour') then
      insert into private.settings (key, value) values (k, left(p ->> k, 200))
      on conflict (key) do update set value = excluded.value;
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- CHIAMATE HTTP (Supabase Auth, SendGrid, Telegram)
-- ---------------------------------------------------------------------
-- Chiamata sincrona (si aspetta la risposta): per creare account e inviare email
create or replace function private.http_json(p_method text, p_url text, p_headers jsonb, p_body jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r extensions.http_response;
  h extensions.http_header[];
  attempt int := 0;
begin
  perform extensions.http_set_curlopt('CURLOPT_CONNECTTIMEOUT', '8');
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '20');
  select coalesce(array_agg(extensions.http_header(key, value)), '{}') into h from jsonb_each_text(coalesce(p_headers, '{}'));
  -- Un secondo tentativo se la rete di Supabase ha un momento di instabilità (connessione scaduta)
  loop
    attempt := attempt + 1;
    begin
      r := extensions.http((p_method, p_url, h, 'application/json', case when p_body is null then null else p_body::text end)::extensions.http_request);
      exit;
    exception when others then
      if attempt >= 2 or sqlerrm !~* 'timed out|resolve|connect' then
        raise exception 'Collegamento non riuscito (%): riprova tra un minuto', left(sqlerrm, 80);
      end if;
      perform pg_sleep(1);
    end;
  end loop;
  return jsonb_build_object('status', r.status, 'body', case when r.content ~ '^\s*[\[{]' then r.content::jsonb else to_jsonb(r.content) end);
end;
$$;

-- API amministrativa di Supabase Auth (richiede la chiave di servizio, salvata nel Vault)
create or replace function private.auth_admin(p_method text, p_path text, p_body jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text := private.secret('sospro_service_key');
  res jsonb;
begin
  if v_key is null then
    raise exception 'Manca la chiave di servizio Supabase: pannello → Impostazioni';
  end if;
  res := private.http_json(p_method, private.setting('project_url') || '/auth/v1' || p_path,
           -- Chiavi nuove (sb_secret_…): solo nell'intestazione apikey, Supabase crea da sé il token.
           -- Chiavi vecchie (service_role, JWT "eyJ…"): anche come Authorization: Bearer.
           case when v_key like 'sb\_%'
                then jsonb_build_object('apikey', v_key)
                else jsonb_build_object('apikey', v_key, 'Authorization', 'Bearer ' || v_key) end,
           p_body);
  if (res ->> 'status')::int >= 300 then
    raise exception 'Supabase Auth %: %', res ->> 'status',
      left(coalesce(res -> 'body' ->> 'msg', res -> 'body' ->> 'message', res -> 'body' ->> 'error_description', res ->> 'body'), 200);
  end if;
  return res -> 'body';
end;
$$;

-- Telegram: invio senza attendere (pg_net), così un problema di rete non blocca mai l'app
create or replace function private.tg_send(p_text text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := private.secret('sospro_telegram_token');
  v_chat  text := private.setting('telegram_chat_id');
begin
  if v_token is null or v_chat = '' then
    return;
  end if;
  perform net.http_post(
    url     := 'https://api.telegram.org/bot' || v_token || '/sendMessage',
    body    := jsonb_build_object('chat_id', v_chat, 'text', left(p_text, 4000), 'parse_mode', 'HTML',
                                  'disable_web_page_preview', true),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 10000
  );
end;
$$;

create or replace function private.h(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(replace(replace(coalesce(p, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
$$;

-- ---------------------------------------------------------------------
-- NOTIFICHE TELEGRAM IN TEMPO REALE
-- ---------------------------------------------------------------------
create or replace function private.notify_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  site text := private.setting('site_url');
  msg  text;
  who  text;
begin
  begin
    if tg_table_name = 'profiles' and private.setting('notify_signup') = 'true' then
      msg := case when new.role = 'pro' then '🛠️ <b>Nuovo professionista</b>' else '👤 <b>Nuovo utente</b>' end
             || E'\n' || private.h(new.name)
             || coalesce(' · ' || private.h(nullif(concat_ws(', ', new.city, new.country), '')), '')
             || E'\n' || private.h((select email from auth.users where id = new.id));
    elsif tg_table_name = 'listings' and private.setting('notify_listing') = 'true' then
      msg := '📢 <b>Nuovo annuncio</b>' || E'\n' || private.h(new.title)
             || E'\n' || private.h(new.name) || ' · ' || private.h(new.category_id) || ' · ' || private.h(new.city) || ', ' || new.country
             || E'\n' || site || '/?ad=' || new.id;
    elsif tg_table_name = 'requests' and private.setting('notify_request') = 'true' then
      msg := case when new.urgent then '🚨 <b>Nuova richiesta URGENTE</b>' else '🙋 <b>Nuova richiesta</b>' end
             || E'\n«' || private.h(left(new.body, 300)) || '»'
             || E'\n' || private.h(new.category_id) || ' · ' || private.h(new.city) || ', ' || new.country
             || E'\n' || site || '/?req=' || new.id;
    elsif tg_table_name = 'reports' and private.setting('notify_report') = 'true' then
      msg := '⚠️ <b>Nuova segnalazione</b> — da moderare'
             || case when new.listing_id is not null then E'\nAnnuncio: ' || site || '/?ad=' || new.listing_id else '' end
             || case when new.request_id is not null then E'\nRichiesta: ' || site || '/?req=' || new.request_id else '' end
             || case when new.review_id  is not null then E'\nRecensione su un annuncio' else '' end
             || coalesce(E'\nMotivo: ' || private.h(left(new.reason, 300)), '')
             || E'\n' || site || '/admin.html#reports';
    elsif tg_table_name = 'reviews' and private.setting('notify_review') = 'true' then
      msg := '⭐ <b>Nuova recensione</b> ' || repeat('★', new.rating) || repeat('☆', 5 - new.rating)
             || E'\n«' || private.h(left(new.comment, 300)) || '» — ' || private.h(new.author_name)
             || E'\n' || site || '/?ad=' || new.listing_id;
    elsif tg_table_name = 'waitlist' and private.setting('notify_waitlist') = 'true' then
      msg := '🔔 <b>Lista d''attesa</b>: ' || private.h(nullif(concat_ws(' · ', nullif(new.category_id, ''), nullif(new.city, ''), new.country), ''));
    end if;
    if msg is not null then
      perform private.tg_send(msg);
    end if;
  exception when others then
    -- Una notifica non riuscita non deve mai bloccare una registrazione o un annuncio
    raise warning 'notify_event: %', sqlerrm;
  end;
  return null;
end;
$$;

drop trigger if exists admin_notify on public.profiles;
create trigger admin_notify after insert on public.profiles for each row execute function private.notify_event();
drop trigger if exists admin_notify on public.listings;
create trigger admin_notify after insert on public.listings for each row execute function private.notify_event();
drop trigger if exists admin_notify on public.requests;
create trigger admin_notify after insert on public.requests for each row execute function private.notify_event();
drop trigger if exists admin_notify on public.reports;
create trigger admin_notify after insert on public.reports for each row execute function private.notify_event();
drop trigger if exists admin_notify on public.reviews;
create trigger admin_notify after insert on public.reviews for each row execute function private.notify_event();
drop trigger if exists admin_notify on public.waitlist;
create trigger admin_notify after insert on public.waitlist for each row execute function private.notify_event();

-- ---------------------------------------------------------------------
-- SEGNALAZIONI: stato di gestione
-- ---------------------------------------------------------------------
alter table public.reports add column if not exists resolved_at timestamptz;
alter table public.reports add column if not exists resolution text check (resolution is null or char_length(resolution) <= 200);

-- ---------------------------------------------------------------------
-- EMAIL: registro, disiscrizioni, contatti da invitare
-- ---------------------------------------------------------------------
create table if not exists private.email_log (
  id         uuid primary key default gen_random_uuid(),
  to_email   text not null,
  subject    text not null,
  body       text not null default '',
  kind       text not null default 'manual',
  user_id    uuid,
  contact_id uuid,
  status     text not null default 'sent' check (status in ('sent', 'error')),
  error      text,
  sent_by    uuid,
  created_at timestamptz not null default now()
);
create index if not exists email_log_created_idx on private.email_log (created_at desc);

create table if not exists private.email_optout (
  email      text primary key,
  created_at timestamptz not null default now(),
  source     text not null default 'link'
);

create table if not exists private.contacts (
  id             uuid primary key default gen_random_uuid(),
  business_name  text not null check (char_length(business_name) between 1 and 160),
  category       text not null default '',
  city           text not null default '',
  country        text not null default 'IT',
  email          text,
  phone          text,
  website        text,
  source         text,
  notes          text not null default '',
  lang           text not null default 'it',
  status         text not null default 'new'
                 check (status in ('new', 'invited', 'replied', 'consented', 'published', 'declined', 'optout', 'bounced')),
  user_id        uuid references auth.users (id) on delete set null,
  last_contacted timestamptz,
  created_at     timestamptz not null default now()
);
create unique index if not exists contacts_email_uidx on private.contacts (lower(email)) where email is not null and email <> '';
create unique index if not exists contacts_name_city_uidx on private.contacts (lower(business_name), lower(city));

-- Link personale dell'invito (sospro24.com/?inv=<token>): sappiamo chi apre l'invito senza pixel nascosti
alter table private.contacts add column if not exists token text;
alter table private.contacts add column if not exists clicks int not null default 0;
alter table private.contacts add column if not exists first_click timestamptz;
alter table private.contacts add column if not exists last_click timestamptz;
-- Aperture entro 3 minuti dall'invio: quasi sempre antivirus/filtri della posta, non persone
alter table private.contacts add column if not exists bot_clicks int not null default 0;
update private.contacts
   set bot_clicks = bot_clicks + clicks, clicks = 0, first_click = null, last_click = null
 where clicks > 0 and last_contacted is not null
   and first_click between last_contacted and last_contacted + interval '3 minutes'
   and last_click <= last_contacted + interval '3 minutes';
update private.contacts set token = encode(extensions.gen_random_bytes(9), 'hex') where token is null;
alter table private.contacts alter column token set default encode(extensions.gen_random_bytes(9), 'hex');
create unique index if not exists contacts_token_uidx on private.contacts (token);

-- Chiamata dal sito quando qualcuno apre il link dell'invito (anche senza account)
create or replace function public.invite_open(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{12,40}$' then
    return;
  end if;
  -- Entro 3 minuti dall'invio = controllo automatico della casella: si conta a parte, senza notifica
  update private.contacts set bot_clicks = bot_clicks + 1
   where token = p_token and last_contacted > now() - interval '3 minutes';
  if found then
    return;
  end if;
  update private.contacts
     set clicks = clicks + 1, first_click = coalesce(first_click, now()), last_click = now()
   where token = p_token
  returning business_name, city, category, clicks into c;
  if found and c.clicks = 1 then
    perform private.tg_send('👀 <b>Ha aperto l''invito</b>: ' || private.h(c.business_name)
      || coalesce(' · ' || private.h(nullif(c.category, '')), '') || coalesce(' · ' || private.h(nullif(c.city, '')), '')
      || E'\n' || private.setting('site_url') || '/admin.html#contacts');
  end if;
end;
$$;

create or replace function private.unsub_token(p_email text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select left(encode(extensions.hmac(lower(btrim(p_email)), private.secret('sospro_unsub_key'), 'sha256'), 'hex'), 32);
$$;

-- Pagina pubblica sospro24.com/unsubscribe.html: chiunque abbia il link firmato può disiscriversi
create or replace function public.email_unsubscribe(p_email text, p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  e text := lower(btrim(coalesce(p_email, '')));
begin
  if e = '' or p_token is null or p_token <> private.unsub_token(e) then
    return false;
  end if;
  insert into private.email_optout (email) values (e) on conflict do nothing;
  update private.contacts set status = 'optout' where lower(email) = e;
  perform private.tg_send('🚫 Disiscrizione email: ' || private.h(e));
  return true;
end;
$$;

-- Invia un'email con SendGrid. Testo semplice: il piè di pagina con chi siamo e il link
-- di disiscrizione viene aggiunto qui, sempre.
create or replace function private.send_mail(p_to text, p_subject text, p_text text, p_lang text,
                                             p_kind text, p_user uuid, p_contact uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key    text := private.secret('sospro_sendgrid_key');
  v_to     text := lower(btrim(coalesce(p_to, '')));
  v_unsub  text;
  v_note   text;
  v_stop   text;
  v_plain  text;
  v_html   text;
  v_limit  int  := coalesce(nullif(private.setting('mail_daily_limit'), '')::int, 300);
  v_count  int;
  res      jsonb;
  v_err    text;
begin
  if v_key is null then
    raise exception 'Manca la chiave SendGrid: pannello → Impostazioni';
  end if;
  if v_to !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Email non valida: %', p_to;
  end if;
  if exists (select 1 from private.email_optout where email = v_to) then
    raise exception 'Questo indirizzo si è disiscritto: non si può scrivere';
  end if;
  if char_length(coalesce(p_subject, '')) < 2 or char_length(coalesce(p_text, '')) < 10 then
    raise exception 'Oggetto o testo troppo corti';
  end if;
  select count(*) into v_count from private.email_log where status = 'sent' and created_at > now() - interval '1 day';
  if v_count >= v_limit then
    raise exception 'Limite giornaliero raggiunto (% email in 24 ore)', v_limit;
  end if;

  v_unsub := private.setting('site_url') || '/unsubscribe.html?e=' || replace(replace(v_to, '+', '%2B'), '@', '%40')
             || '&t=' || private.unsub_token(v_to);
  v_note := case coalesce(p_lang, 'it')
    when 'en' then 'SOSPro24 is run by INZA KONE – Ikonet Solutions, Italy. Reply to this email to contact us.'
    when 'fr' then 'SOSPro24 est édité par INZA KONE – Ikonet Solutions, Italie. Répondez à cet e-mail pour nous écrire.'
    when 'es' then 'SOSPro24 está gestionado por INZA KONE – Ikonet Solutions, Italia. Responde a este correo para escribirnos.'
    when 'de' then 'SOSPro24 wird betrieben von INZA KONE – Ikonet Solutions, Italien. Antworten Sie auf diese E-Mail, um uns zu schreiben.'
    else 'SOSPro24 è gestito da INZA KONE – Ikonet Solutions, Italia. Rispondi a questa email per scriverci.' end;
  v_stop := case coalesce(p_lang, 'it')
    when 'en' then 'Stop receiving these emails'
    when 'fr' then 'Ne plus recevoir ces e-mails'
    when 'es' then 'No recibir más estos correos'
    when 'de' then 'Keine weiteren E-Mails erhalten'
    else 'Non ricevere più queste email' end;

  v_plain := p_text || E'\n\n--\n' || v_note || E'\n' || v_stop || ': ' || v_unsub;
  v_html := '<div style="font:15px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;max-width:560px">'
         || '<p>' || regexp_replace(replace(private.h(p_text), E'\n', '<br>'),
                                    '(https?://[^\s<>"]+)', '<a href="\1" style="color:#1d4ed8">\1</a>', 'g') || '</p>'
         || '<hr style="border:0;border-top:1px solid #e2e8f0;margin:28px 0 12px">'
         || '<p style="font-size:12px;color:#64748b">' || private.h(v_note) || '<br>'
         || '<a href="' || private.h(v_unsub) || '" style="color:#64748b">' || private.h(v_stop) || '</a></p></div>';

  res := private.http_json('POST', 'https://api.sendgrid.com/v3/mail/send',
    jsonb_build_object('Authorization', 'Bearer ' || v_key),
    jsonb_build_object(
      'personalizations', jsonb_build_array(jsonb_build_object('to', jsonb_build_array(jsonb_build_object('email', v_to)))),
      'from', jsonb_build_object('email', private.setting('mail_from'), 'name', private.setting('mail_from_name')),
      'reply_to', jsonb_build_object('email', private.setting('mail_reply_to')),
      'subject', p_subject,
      'content', jsonb_build_array(jsonb_build_object('type', 'text/plain', 'value', v_plain),
                                   jsonb_build_object('type', 'text/html', 'value', v_html)),
      'headers', jsonb_build_object('List-Unsubscribe',
                   '<mailto:' || private.setting('mail_reply_to') || '?subject=unsubscribe>, <' || v_unsub || '>'),
      'tracking_settings', jsonb_build_object('click_tracking', jsonb_build_object('enable', false, 'enable_text', false),
                                              'open_tracking', jsonb_build_object('enable', false))
    ));

  if (res ->> 'status')::int >= 300 then
    v_err := 'SendGrid ' || (res ->> 'status') || ': ' || left(coalesce(res -> 'body' -> 'errors' -> 0 ->> 'message', res ->> 'body'), 200);
  end if;

  insert into private.email_log (to_email, subject, body, kind, user_id, contact_id, status, error, sent_by)
  values (v_to, p_subject, p_text, coalesce(p_kind, 'manual'), p_user, p_contact,
          case when v_err is null then 'sent' else 'error' end, v_err, auth.uid());

  -- Nessun "raise" qui: annullerebbe anche la riga di errore appena scritta nel registro
  if v_err is not null then
    return jsonb_build_object('ok', false, 'to', v_to, 'error', v_err);
  end if;
  if p_contact is not null then
    update private.contacts
       set last_contacted = now(), status = case when status = 'new' then 'invited' else status end
     where id = p_contact;
  end if;
  return jsonb_build_object('ok', true, 'to', v_to);
end;
$$;

create or replace function public.admin_send_email(p_to text, p_subject text, p_text text, p_lang text default 'it',
                                                   p_kind text default 'manual', p_user uuid default null,
                                                   p_contact uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return private.send_mail(p_to, p_subject, p_text, p_lang, p_kind, p_user, p_contact);
end;
$$;

create or replace function public.admin_email_log(p_limit int default 100)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
    select to_jsonb(l) - 'sent_by' from private.email_log l order by created_at desc limit least(greatest(p_limit, 1), 500);
end;
$$;

-- Contatti da invitare (es. dai file PagineGialle): importazione, elenco, modifica
create or replace function public.admin_import_contacts(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r jsonb;
  added int := 0;
  skipped int := 0;
  v_email text;
begin
  perform private.require_admin();
  for r in select * from jsonb_array_elements(p_rows) loop
    v_email := nullif(lower(btrim(coalesce(r ->> 'email', ''))), '');
    if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      v_email := null;
    end if;
    begin
      insert into private.contacts (business_name, category, city, country, email, phone, website, source, notes, lang, status)
      values (left(btrim(r ->> 'business_name'), 160), left(coalesce(r ->> 'category', ''), 80),
              left(coalesce(r ->> 'city', ''), 80), upper(left(coalesce(nullif(r ->> 'country', ''), 'IT'), 3)),
              v_email, left(nullif(r ->> 'phone', ''), 60), left(nullif(r ->> 'website', ''), 300),
              left(nullif(r ->> 'source', ''), 300), left(coalesce(r ->> 'notes', ''), 1000),
              left(coalesce(nullif(r ->> 'lang', ''), 'it'), 5),
              case when exists (select 1 from private.email_optout o where o.email = v_email) then 'optout' else 'new' end);
      added := added + 1;
    exception when unique_violation or check_violation or not_null_violation then
      skipped := skipped + 1;
    end;
  end loop;
  return jsonb_build_object('added', added, 'skipped', skipped);
end;
$$;

create or replace function public.admin_list_contacts()
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
    select to_jsonb(c) || jsonb_build_object(
             'emails_sent', (select count(*) from private.email_log l where l.contact_id = c.id and l.status = 'sent'))
    from private.contacts c
    order by c.created_at desc, c.business_name;
end;
$$;

create or replace function public.admin_update_contact(p_id uuid, p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  update private.contacts set
    business_name = coalesce(left(p ->> 'business_name', 160), business_name),
    category      = coalesce(left(p ->> 'category', 80), category),
    city          = coalesce(left(p ->> 'city', 80), city),
    email         = case when p ? 'email' then nullif(lower(btrim(p ->> 'email')), '') else email end,
    phone         = case when p ? 'phone' then nullif(p ->> 'phone', '') else phone end,
    notes         = coalesce(left(p ->> 'notes', 1000), notes),
    status        = coalesce(p ->> 'status', status),
    lang          = coalesce(p ->> 'lang', lang)
  where id = p_id;
end;
$$;

create or replace function public.admin_delete_contact(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  delete from private.contacts where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------
-- ANTEPRIMA DELL'ANNUNCIO (sospro24.com/anteprima.html?t=<token del contatto>)
-- Il professionista invitato vede una bozza con i dati pubblici della sua attività
-- (mai pubblicata senza di lui), la corregge e la pubblica con un click: si creano
-- account e annuncio. Oppure preme "Non mi interessa" e non viene più contattato.
-- ---------------------------------------------------------------------
create or replace function private.guess_category(p text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when p ~* 'idraul|plumb' then '{"category_id":"home_sos","subcategory_id":"plumber"}'
    when p ~* 'elettric|electric' then '{"category_id":"home_sos","subcategory_id":"electrician"}'
    when p ~* 'fabbr|serratur|apertura porte|locksmith' then '{"category_id":"home_sos","subcategory_id":"locksmith"}'
    when p ~* 'caldai|clima|condizion|riscald|hvac' then '{"category_id":"home_sos","subcategory_id":"hvac"}'
    when p ~* 'tuttofare|montaggio|imbianc|tinteggi|manutenz' then '{"category_id":"home_sos","subcategory_id":"handyman"}'
    when p ~* 'pulizi|cleaning|sanific' then '{"category_id":"care_person","subcategory_id":"cleaning"}'
    when p ~* 'informatic|computer|smartphone|cellular|IT repair' then '{"category_id":"consulting_tech","subcategory_id":"it_repair"}'
    else '{"category_id":"home_sos","subcategory_id":"handyman"}' end::jsonb;
$$;

create or replace function public.preview_get(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
  v_listing uuid;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{12,40}$' then
    raise exception 'Link non valido';
  end if;
  select * into c from private.contacts where token = p_token;
  if c.id is null then
    raise exception 'Link non valido';
  end if;
  perform public.invite_open(p_token); -- conta l'apertura (o l'antivirus) come per il link dell'invito
  if c.user_id is not null then
    select id into v_listing from public.listings where owner_id = c.user_id order by created_at desc limit 1;
    return jsonb_build_object('status', 'active', 'name', c.business_name, 'listing_id', v_listing);
  end if;
  if c.status in ('optout', 'declined') then
    return jsonb_build_object('status', 'declined', 'name', c.business_name);
  end if;
  return jsonb_build_object(
    'status', 'draft', 'name', c.business_name, 'category', c.category, 'city', c.city, 'country', c.country,
    'phone', coalesce(c.phone, ''), 'website', coalesce(c.website, ''), 'email', coalesce(c.email, ''), 'lang', c.lang
  ) || private.guess_category(c.category || ' ' || c.business_name);
end;
$$;

create or replace function public.preview_activate(p_token text, p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c        record;
  v_email  text := lower(btrim(coalesce(p ->> 'email', '')));
  v_name   text := left(btrim(coalesce(p ->> 'name', '')), 80);
  v_city   text := left(btrim(coalesce(p ->> 'city', '')), 80);
  v_title  text := left(btrim(coalesce(p ->> 'title', '')), 110);
  v_desc   text := left(btrim(coalesce(p ->> 'description', '')), 800);
  v_phone  text := btrim(coalesce(p ->> 'phone', ''));
  v_rate   numeric;
  v_id     uuid;
  v_new    boolean := false;
  v_user   jsonb;
  v_listing uuid;
  v_mail   jsonb;
  v_lang   text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{12,40}$' then
    raise exception 'Link non valido';
  end if;
  select * into c from private.contacts where token = p_token for update;
  if c.id is null then
    raise exception 'Link non valido';
  end if;
  if c.user_id is not null then
    raise exception 'Questo annuncio è già stato attivato: accedi su sospro24.com';
  end if;
  if coalesce(p ->> 'accept', '') <> 'true' then
    raise exception 'Per pubblicare devi accettare le Condizioni di utilizzo';
  end if;
  if v_email = '' then v_email := lower(coalesce(c.email, '')); end if;
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Email non valida'; end if;
  if char_length(v_name) < 2 then raise exception 'Inserisci il nome dell''attività'; end if;
  if v_city = '' then raise exception 'Inserisci la città'; end if;
  if char_length(v_title) < 3 then raise exception 'Il titolo è troppo corto'; end if;
  if char_length(v_desc) < 10 then raise exception 'La descrizione è troppo corta (almeno 10 caratteri)'; end if;
  begin v_rate := nullif(replace(p ->> 'hourly_rate', ',', '.'), '')::numeric; exception when others then v_rate := null; end;
  if v_rate is null or v_rate <= 0 or v_rate > 1000 then raise exception 'Indica una tariffa oraria indicativa (in euro)'; end if;
  if v_phone <> '' and v_phone !~ '^\+?[0-9 ().-]{8,22}$' then raise exception 'Numero di telefono non valido'; end if;
  if (p ->> 'subcategory_id') is null or (p ->> 'category_id') is null then raise exception 'Scegli la categoria'; end if;
  v_lang := case when c.lang in ('it', 'en', 'fr', 'es', 'de') then c.lang else 'it' end;

  select id into v_id from auth.users where lower(email) = v_email;
  if v_id is not null and v_email <> lower(coalesce(c.email, '')) then
    raise exception 'Esiste già un account con questa email: accedi su sospro24.com e pubblica da lì';
  end if;
  if v_id is null then
    v_user := private.auth_admin('POST', '/admin/users', jsonb_build_object(
      'email', v_email, 'email_confirm', true,
      'user_metadata', jsonb_build_object('name', v_name, 'role', 'pro', 'country', upper(coalesce(c.country, 'IT')), 'city', v_city, 'lang', v_lang)));
    v_id := (v_user ->> 'id')::uuid;
    v_new := true;
  end if;

  insert into public.listings (owner_id, name, country, city, zone, category_id, subcategory_id, title, description,
                               hourly_rate, call_out_fee, currency, languages, skills, sos_available)
  values (v_id, v_name, upper(coalesce(c.country, 'IT')), v_city, coalesce(nullif(left(btrim(p ->> 'zone'), 80), ''), v_city),
          left(p ->> 'category_id', 40), left(p ->> 'subcategory_id', 40), v_title, v_desc, v_rate, 0,
          case upper(coalesce(c.country, 'IT')) when 'CH' then 'CHF' when 'GB' then '£' else '€' end,
          case v_lang when 'en' then '{English}' when 'fr' then '{Français}' when 'es' then '{Español}' when 'de' then '{Deutsch}' else '{Italiano}' end::text[],
          '{}', coalesce((p ->> 'sos')::boolean, false))
  returning id into v_listing;
  if v_phone <> '' then
    insert into public.listing_contacts (listing_id, phone) values (v_listing, v_phone);
  end if;
  update private.contacts set user_id = v_id, status = 'published', email = coalesce(email, v_email) where id = c.id;

  if v_new then
    begin
      v_mail := private.send_welcome(v_id, c.id);
    exception when others then
      v_mail := jsonb_build_object('ok', false, 'error', sqlerrm);
    end;
  end if;
  perform private.tg_send('🎉 <b>Annuncio attivato dall''anteprima</b>' || E'\n' || private.h(v_name) || ' · ' || private.h(v_city)
    || E'\n' || private.setting('site_url') || '/?ad=' || v_listing);
  return jsonb_build_object('ok', true, 'listing_id', v_listing, 'new_account', v_new,
                            'email_sent', coalesce((v_mail ->> 'ok')::boolean, false));
end;
$$;

-- "Non mi interessa" dalla pagina di anteprima: niente più email, contatto segnato come non interessato
create or replace function public.preview_decline(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{12,40}$' then
    return false;
  end if;
  select * into c from private.contacts where token = p_token;
  if c.id is null or c.user_id is not null then
    return false;
  end if;
  update private.contacts set status = 'declined' where id = c.id;
  if c.email is not null then
    insert into private.email_optout (email, source) values (lower(c.email), 'anteprima') on conflict do nothing;
  end if;
  perform private.tg_send('🙅 Non interessato (anteprima): ' || private.h(c.business_name) || coalesce(' · ' || private.h(nullif(c.city, '')), ''));
  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- DASHBOARD
-- ---------------------------------------------------------------------
create or replace function private.counts(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'users',    (select count(*) from public.profiles where created_at >= p_from and created_at < p_to),
    'pros',     (select count(*) from public.profiles where role = 'pro' and created_at >= p_from and created_at < p_to),
    'listings', (select count(*) from public.listings where created_at >= p_from and created_at < p_to),
    'requests', (select count(*) from public.requests where created_at >= p_from and created_at < p_to),
    'reviews',  (select count(*) from public.reviews  where created_at >= p_from and created_at < p_to),
    'reports',  (select count(*) from public.reports  where created_at >= p_from and created_at < p_to),
    'waitlist', (select count(*) from public.waitlist where created_at >= p_from and created_at < p_to),
    'emails',   (select count(*) from private.email_log where status = 'sent' and created_at >= p_from and created_at < p_to)
  );
$$;

create or replace function private.totals()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'users',            (select count(*) from public.profiles),
    'pros',             (select count(*) from public.profiles where role = 'pro'),
    'clients',          (select count(*) from public.profiles where role = 'client'),
    'listings_active',  (select count(*) from public.listings where status = 'active'),
    'listings_all',     (select count(*) from public.listings),
    'requests_active',  (select count(*) from public.requests where status = 'active' and expires_at > now()),
    'reports_open',     (select count(*) from public.reports where resolved_at is null),
    'waitlist',         (select count(*) from public.waitlist),
    'reviews',          (select count(*) from public.reviews),
    'contacts',         (select count(*) from private.contacts),
    'contacts_invited', (select count(*) from private.contacts where status <> 'new'),
    'contacts_opened',  (select count(*) from private.contacts where clicks > 0),
    'contacts_published', (select count(*) from private.contacts where status = 'published'),
    'unconfirmed',      (select count(*) from auth.users where email_confirmed_at is null)
  );
$$;

create or replace function public.admin_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  today timestamptz := (date_trunc('day', now() at time zone 'Europe/Rome')) at time zone 'Europe/Rome';
begin
  perform private.require_admin();
  return jsonb_build_object(
    'totals', private.totals(),
    'today',  private.counts(today, now() + interval '1 minute'),
    'yesterday', private.counts(today - interval '1 day', today),
    'week',   private.counts(now() - interval '7 days', now() + interval '1 minute'),
    'by_country', (select coalesce(jsonb_object_agg(country, n), '{}') from
                    (select country, count(*) n from public.listings where status = 'active' group by country) x),
    'daily', (select jsonb_agg(jsonb_build_object('day', d::date,
                      'users', (select count(*) from public.profiles p where (p.created_at at time zone 'Europe/Rome')::date = d::date),
                      'listings', (select count(*) from public.listings l where (l.created_at at time zone 'Europe/Rome')::date = d::date),
                      'requests', (select count(*) from public.requests r where (r.created_at at time zone 'Europe/Rome')::date = d::date)) order by d)
              from generate_series(((now() at time zone 'Europe/Rome')::date - 29)::timestamp,
                                   (now() at time zone 'Europe/Rome')::date::timestamp, interval '1 day') d)
  );
end;
$$;

-- ---------------------------------------------------------------------
-- ACCOUNT
-- ---------------------------------------------------------------------
create or replace function public.admin_list_users()
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
    select jsonb_build_object(
      'id', u.id, 'email', u.email, 'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at,
      'confirmed', u.email_confirmed_at is not null, 'banned', coalesce(u.banned_until > now(), false),
      'name', p.name, 'role', p.role, 'country', p.country, 'city', p.city,
      'lang', u.raw_user_meta_data ->> 'lang',
      'is_admin', exists (select 1 from private.admins a where a.user_id = u.id),
      'listings', (select count(*) from public.listings l where l.owner_id = u.id),
      'requests', (select count(*) from public.requests r where r.owner_id = u.id),
      'reviews',  (select count(*) from public.reviews v where v.author_id = u.id),
      'reported', (select count(*) from public.reports rp
                    where rp.listing_id in (select id from public.listings where owner_id = u.id)
                       or rp.request_id in (select id from public.requests where owner_id = u.id)),
      'opted_out', exists (select 1 from private.email_optout o where o.email = lower(u.email))
    )
    from auth.users u
    left join public.profiles p on p.id = u.id
    order by u.created_at desc;
end;
$$;

create or replace function public.admin_update_user(p_id uuid, p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  update public.profiles set
    name    = coalesce(nullif(left(btrim(p ->> 'name'), 80), ''), name),
    role    = case when p ->> 'role' in ('client', 'pro') then p ->> 'role' else role end,
    country = case when p ? 'country' then nullif(upper(left(p ->> 'country', 3)), '') else country end,
    city    = case when p ? 'city' then nullif(left(btrim(p ->> 'city'), 80), '') else city end
  where id = p_id;
  if nullif(btrim(p ->> 'email'), '') is not null
     and lower(btrim(p ->> 'email')) <> (select lower(email) from auth.users where id = p_id) then
    perform private.auth_admin('PUT', '/admin/users/' || p_id,
      jsonb_build_object('email', lower(btrim(p ->> 'email')), 'email_confirm', true));
  end if;
end;
$$;

-- Benvenuto ai nuovi account: l'email NON contiene il link monouso di Supabase (gli antivirus
-- delle caselle aziendali, es. Microsoft 365, lo aprono e lo "consumano"), ma un link a
-- sospro24.com/benvenuto.html?t=<codice> valido 7 giorni. Lì la persona preme "Scegli la password":
-- solo in quel momento si crea il link di Supabase e lo si apre subito.
create table if not exists private.welcome_tokens (
  token      text primary key default encode(extensions.gen_random_bytes(16), 'hex'),
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at    timestamptz
);

create or replace function private.send_welcome(p_user uuid, p_contact uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  u      record;
  v_lang text;
  v_name text;
  v_tok  text;
  v_url  text;
  v_subj text;
  v_text text;
  v_sign text := E'\n\nIkonet Solutions\nSOSPro24\n📞 Tel. / WhatsApp: +39 329 618 5600\n💬 https://wa.me/393296185600';
begin
  select a.email, a.raw_user_meta_data ->> 'lang' as lang, p.name into u
    from auth.users a left join public.profiles p on p.id = a.id where a.id = p_user;
  if u.email is null then
    raise exception 'Account non trovato';
  end if;
  v_lang := case when u.lang in ('it', 'en', 'fr', 'es', 'de') then u.lang else 'it' end;
  v_name := coalesce(nullif(btrim(u.name), ''), split_part(u.email, '@', 1));
  insert into private.welcome_tokens (user_id) values (p_user) returning token into v_tok;
  v_url := private.setting('site_url') || '/benvenuto.html?t=' || v_tok;
  v_subj := case v_lang
    when 'en' then 'Your SOSPro24 account is ready'
    when 'fr' then 'Votre compte SOSPro24 est prêt'
    when 'es' then 'Tu cuenta de SOSPro24 está lista'
    when 'de' then 'Ihr SOSPro24-Konto ist bereit'
    else 'Il tuo account SOSPro24 è pronto' end;
  v_text := case v_lang
    when 'en' then 'Hello ' || v_name || E',\n\nas agreed, we have created your free SOSPro24 account with this email address.\nOpen this page and tap "Choose your password" (valid for 7 days):\n' || v_url || E'\n\nThen sign in at https://sospro24.com with this email and your new password, and check your profile and ad. You can edit or delete them at any time.\n\nThank you,' || v_sign
    when 'fr' then 'Bonjour ' || v_name || E',\n\ncomme convenu, nous avons créé votre compte SOSPro24 gratuit avec cette adresse.\nOuvrez cette page et touchez « Choisir mon mot de passe » (valable 7 jours) :\n' || v_url || E'\n\nConnectez-vous ensuite sur https://sospro24.com avec cette adresse et votre nouveau mot de passe, et vérifiez votre profil et votre annonce. Vous pouvez les modifier ou les supprimer à tout moment.\n\nMerci,' || v_sign
    when 'es' then 'Hola ' || v_name || E',\n\ncomo acordamos, hemos creado tu cuenta gratuita de SOSPro24 con esta dirección.\nAbre esta página y toca «Elegir mi contraseña» (vale 7 días):\n' || v_url || E'\n\nDespués inicia sesión en https://sospro24.com con este correo y tu nueva contraseña, y revisa tu perfil y tu anuncio. Puedes modificarlos o eliminarlos cuando quieras.\n\nGracias,' || v_sign
    when 'de' then 'Hallo ' || v_name || E',\n\nwie besprochen haben wir Ihr kostenloses SOSPro24-Konto mit dieser Adresse erstellt.\nÖffnen Sie diese Seite und tippen Sie auf „Passwort festlegen“ (7 Tage gültig):\n' || v_url || E'\n\nMelden Sie sich danach auf https://sospro24.com mit dieser Adresse und Ihrem neuen Passwort an und prüfen Sie Profil und Anzeige. Sie können beides jederzeit ändern oder löschen.\n\nDanke,' || v_sign
    else 'Ciao ' || v_name || E',\n\ncome d''accordo abbiamo creato il tuo account gratuito su SOSPro24 con questo indirizzo email.\nApri questa pagina e premi "Scegli la tua password" (vale 7 giorni):\n' || v_url || E'\n\nPoi accedi su https://sospro24.com con questa email e la nuova password, e controlla il tuo profilo e il tuo annuncio. Puoi modificarli o eliminarli quando vuoi.\n\nGrazie,' || v_sign end;
  return private.send_mail(u.email, v_subj, v_text, v_lang, 'welcome', p_user, p_contact);
end;
$$;

-- Crea un account già confermato e (se richiesto) gli manda l'email di benvenuto.
-- Utile per l'iscrizione assistita dei professionisti.
create or replace function public.admin_create_user(p_email text, p_name text, p_role text default 'pro',
                                                    p_country text default 'IT', p_city text default null,
                                                    p_lang text default 'it', p_welcome boolean default true,
                                                    p_contact uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_user  jsonb;
  v_id    uuid;
  v_mail  jsonb;
  v_lang  text := case when p_lang in ('it', 'en', 'fr', 'es', 'de') then p_lang else 'it' end;
begin
  perform private.require_admin();
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Email non valida';
  end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'Esiste già un account con questa email';
  end if;
  v_user := private.auth_admin('POST', '/admin/users', jsonb_build_object(
    'email', v_email,
    'email_confirm', true,
    'user_metadata', jsonb_build_object('name', left(btrim(p_name), 80), 'role', case when p_role = 'client' then 'client' else 'pro' end,
                                        'country', upper(coalesce(p_country, '')), 'city', coalesce(p_city, ''), 'lang', v_lang)
  ));
  v_id := (v_user ->> 'id')::uuid;
  if p_contact is not null then
    update private.contacts set user_id = v_id, status = 'consented' where id = p_contact;
  end if;
  if p_welcome then
    begin
      v_mail := private.send_welcome(v_id, p_contact);
    exception when others then
      v_mail := jsonb_build_object('ok', false, 'error', sqlerrm);
    end;
    if not coalesce((v_mail ->> 'ok')::boolean, false) then
      return jsonb_build_object('id', v_id, 'email_sent', false, 'email_error', v_mail ->> 'error');
    end if;
  end if;
  return jsonb_build_object('id', v_id, 'email_sent', p_welcome);
end;
$$;

-- Rimanda l'email di benvenuto (es. il link è scaduto o la persona non la trova)
create or replace function public.admin_send_welcome(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return private.send_welcome(p_user, (select id from private.contacts where user_id = p_user limit 1));
end;
$$;

-- Chiamata dalla pagina sospro24.com/benvenuto.html quando la persona preme il pulsante:
-- crea in quel momento il link monouso di Supabase per scegliere la password.
create or replace function public.welcome_start(p_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  w     record;
  v_link jsonb;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{32}$' then
    raise exception 'Link non valido';
  end if;
  select t.user_id, t.expires_at, a.email into w
    from private.welcome_tokens t join auth.users a on a.id = t.user_id
   where t.token = p_token;
  if w.user_id is null then
    raise exception 'Link non valido';
  end if;
  if w.expires_at < now() then
    raise exception 'Link scaduto';
  end if;
  v_link := private.auth_admin('POST', '/admin/generate_link', jsonb_build_object(
    'type', 'recovery', 'email', w.email, 'redirect_to', private.setting('site_url') || '/'));
  update private.welcome_tokens set used_at = coalesce(used_at, now()) where token = p_token;
  return coalesce(v_link ->> 'action_link', v_link -> 'properties' ->> 'action_link');
end;
$$;

-- Conferma a mano l'email di un account bloccato (es. l'email di conferma è finita in spam):
-- la persona può accedere subito con la password che ha scelto all'iscrizione
create or replace function public.admin_confirm_email(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  perform private.auth_admin('PUT', '/admin/users/' || p_id, jsonb_build_object('email_confirm', true));
end;
$$;

-- Blocca / sblocca: l'account non può più accedere, annunci nascosti e richieste rimosse
create or replace function public.admin_set_banned(p_id uuid, p_banned boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  if p_id = auth.uid() then
    raise exception 'Non puoi bloccare il tuo account';
  end if;
  perform private.auth_admin('PUT', '/admin/users/' || p_id,
    jsonb_build_object('ban_duration', case when p_banned then '876000h' else 'none' end));
  if p_banned then
    update public.listings set status = 'hidden' where owner_id = p_id and status = 'active';
    update public.requests set status = 'removed' where owner_id = p_id and status = 'active';
  else
    update public.listings set status = 'active' where owner_id = p_id and status = 'hidden';
  end if;
  perform private.tg_send(case when p_banned then '⛔ Account bloccato: ' else '✅ Account sbloccato: ' end
    || private.h((select email from auth.users where id = p_id)) || coalesce(' — ' || private.h(p_reason), ''));
end;
$$;

-- Eliminazione definitiva: profilo, annunci, richieste e recensioni spariscono a cascata
create or replace function public.admin_delete_user(p_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  perform private.require_admin();
  if p_id = auth.uid() then
    raise exception 'Non puoi eliminare il tuo account da qui';
  end if;
  select email into v_email from auth.users where id = p_id;
  delete from auth.users where id = p_id;
  perform private.tg_send('🗑️ Account eliminato: ' || private.h(v_email) || coalesce(' — ' || private.h(p_reason), ''));
end;
$$;

-- ---------------------------------------------------------------------
-- ANNUNCI, RICHIESTE, SEGNALAZIONI, LISTA D'ATTESA
-- ---------------------------------------------------------------------
create or replace function public.admin_list_listings()
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
    select to_jsonb(l) || jsonb_build_object(
      'phone', (select phone from public.listing_contacts c where c.listing_id = l.id),
      'owner_email', (select email from auth.users u where u.id = l.owner_id),
      'reviews_count', (select count(*) from public.reviews r where r.listing_id = l.id),
      'reports_open', (select count(*) from public.reports rp where rp.listing_id = l.id and rp.resolved_at is null))
    from public.listings l
    order by l.created_at desc;
end;
$$;

create or replace function public.admin_set_listing(p_id uuid, p_status text default null, p_verified boolean default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  update public.listings set
    status   = case when p_status in ('active', 'hidden', 'removed') then p_status else status end,
    verified = coalesce(p_verified, verified)
  where id = p_id;
end;
$$;

-- Crea o modifica un annuncio per conto di un professionista (con il suo consenso)
create or replace function public.admin_save_listing(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  perform private.require_admin();
  if v_id is null then
    insert into public.listings (owner_id, name, country, city, zone, category_id, subcategory_id, title, description,
                                 hourly_rate, call_out_fee, currency, languages, skills, sos_available)
    values ((p ->> 'owner_id')::uuid, p ->> 'name', upper(p ->> 'country'), p ->> 'city', coalesce(nullif(p ->> 'zone', ''), p ->> 'city'),
            p ->> 'category_id', p ->> 'subcategory_id', p ->> 'title', p ->> 'description',
            (p ->> 'hourly_rate')::numeric, coalesce(nullif(p ->> 'call_out_fee', '')::numeric, 0), coalesce(nullif(p ->> 'currency', ''), '€'),
            coalesce((select array_agg(x) from jsonb_array_elements_text(p -> 'languages') x), '{}'),
            coalesce((select array_agg(x) from jsonb_array_elements_text(p -> 'skills') x), '{}'),
            coalesce((p ->> 'sos_available')::boolean, false))
    returning id into v_id;
  else
    update public.listings set
      name = p ->> 'name', country = upper(p ->> 'country'), city = p ->> 'city',
      zone = coalesce(nullif(p ->> 'zone', ''), p ->> 'city'), category_id = p ->> 'category_id',
      subcategory_id = p ->> 'subcategory_id', title = p ->> 'title', description = p ->> 'description',
      hourly_rate = (p ->> 'hourly_rate')::numeric, call_out_fee = coalesce(nullif(p ->> 'call_out_fee', '')::numeric, 0),
      currency = coalesce(nullif(p ->> 'currency', ''), '€'),
      languages = coalesce((select array_agg(x) from jsonb_array_elements_text(p -> 'languages') x), '{}'),
      skills = coalesce((select array_agg(x) from jsonb_array_elements_text(p -> 'skills') x), '{}'),
      sos_available = coalesce((p ->> 'sos_available')::boolean, false)
    where id = v_id;
  end if;
  if nullif(btrim(p ->> 'phone'), '') is not null then
    insert into public.listing_contacts (listing_id, phone) values (v_id, btrim(p ->> 'phone'))
    on conflict (listing_id) do update set phone = excluded.phone;
  end if;
  return v_id;
end;
$$;

create or replace function public.admin_delete_listing(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  delete from public.listings where id = p_id;
end;
$$;

create or replace function public.admin_list_requests()
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
    select to_jsonb(r) || jsonb_build_object(
      'phone', (select phone from public.request_contacts c where c.request_id = r.id),
      'owner_email', (select email from auth.users u where u.id = r.owner_id))
    from public.requests r
    order by r.created_at desc;
end;
$$;

create or replace function public.admin_set_request(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  if p_status not in ('active', 'closed', 'removed') then
    raise exception 'Stato non valido';
  end if;
  update public.requests set status = p_status where id = p_id;
end;
$$;

create or replace function public.admin_list_reports()
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
    select to_jsonb(rp) || jsonb_build_object(
      'reporter_email', (select email from auth.users u where u.id = rp.reporter_id),
      'listing', (select jsonb_build_object('id', l.id, 'title', l.title, 'name', l.name, 'status', l.status, 'owner_id', l.owner_id,
                                            'owner_email', (select email from auth.users u where u.id = l.owner_id))
                  from public.listings l where l.id = rp.listing_id),
      'request', (select jsonb_build_object('id', q.id, 'body', q.body, 'status', q.status, 'owner_id', q.owner_id,
                                            'owner_email', (select email from auth.users u where u.id = q.owner_id))
                  from public.requests q where q.id = rp.request_id),
      'review',  (select jsonb_build_object('id', v.id, 'comment', v.comment, 'author_name', v.author_name, 'author_id', v.author_id,
                                            'listing_id', v.listing_id)
                  from public.reviews v where v.id = rp.review_id))
    from public.reports rp
    order by (rp.resolved_at is null) desc, rp.created_at desc;
end;
$$;

create or replace function public.admin_resolve_report(p_id uuid, p_resolution text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  update public.reports set resolved_at = now(), resolution = left(coalesce(p_resolution, 'gestita'), 200) where id = p_id;
end;
$$;

create or replace function public.admin_delete_review(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  delete from public.reviews where id = p_id;
end;
$$;

create or replace function public.admin_list_waitlist()
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query select to_jsonb(w) from public.waitlist w order by created_at desc;
end;
$$;

-- ---------------------------------------------------------------------
-- TELEGRAM: collegamento della chat e riepilogo giornaliero
-- ---------------------------------------------------------------------
-- Dopo aver scritto /start al bot, il pannello chiama questa funzione: legge l'ultimo
-- messaggio ricevuto dal bot e salva quella chat come destinataria.
create or replace function public.admin_telegram_link()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := private.secret('sospro_telegram_token');
  res jsonb;
  chat jsonb;
begin
  perform private.require_admin();
  if v_token is null then
    raise exception 'Manca il token del bot Telegram: pannello → Impostazioni';
  end if;
  res := private.http_json('GET', 'https://api.telegram.org/bot' || v_token || '/getUpdates', null, null);
  if (res ->> 'status')::int <> 200 then
    raise exception 'Telegram ha risposto % (token corretto?)', res ->> 'status';
  end if;
  select u -> 'message' -> 'chat' into chat
    from jsonb_array_elements(res -> 'body' -> 'result') u
   where u ? 'message'
   order by (u ->> 'update_id')::bigint desc limit 1;
  if chat is null then
    raise exception 'Nessun messaggio: apri il bot su Telegram, premi Avvia (/start) e riprova';
  end if;
  insert into private.settings (key, value) values ('telegram_chat_id', chat ->> 'id')
  on conflict (key) do update set value = excluded.value;
  perform private.tg_send('✅ <b>SOSPro24 collegato</b>' || E'\nRiceverai qui i movimenti della piattaforma e ogni mattina il riepilogo.');
  return jsonb_build_object('chat_id', chat ->> 'id', 'name', coalesce(chat ->> 'first_name', chat ->> 'title'));
end;
$$;

create or replace function private.summary_text(p_day date)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  f timestamptz := p_day::timestamp at time zone 'Europe/Rome';
  c jsonb := private.counts(f, f + interval '1 day');
  t jsonb := private.totals();
  w jsonb := private.counts(f - interval '6 days', f + interval '1 day');
begin
  return '📊 <b>SOSPro24 — riepilogo di ' || to_char(p_day, 'DD/MM/YYYY') || '</b>' || E'\n\n'
    || '👤 Nuovi utenti: <b>' || (c ->> 'users') || '</b> (di cui professionisti ' || (c ->> 'pros') || ')' || E'\n'
    || '📢 Nuovi annunci: <b>' || (c ->> 'listings') || '</b>' || E'\n'
    || '🙋 Nuove richieste: <b>' || (c ->> 'requests') || '</b>' || E'\n'
    || '⭐ Recensioni: ' || (c ->> 'reviews') || ' · ⚠️ Segnalazioni: ' || (c ->> 'reports') || E'\n'
    || '🔔 Lista d''attesa: ' || (c ->> 'waitlist') || ' · ✉️ Email inviate: ' || (c ->> 'emails') || E'\n\n'
    || '<b>Ultimi 7 giorni</b>: ' || (w ->> 'users') || ' utenti, ' || (w ->> 'listings') || ' annunci, ' || (w ->> 'requests') || ' richieste' || E'\n\n'
    || '<b>Totale</b>: ' || (t ->> 'users') || ' utenti (' || (t ->> 'pros') || ' professionisti) · '
    || (t ->> 'listings_active') || ' annunci attivi · ' || (t ->> 'requests_active') || ' richieste aperte'
    || case when (t ->> 'reports_open')::int > 0 then E'\n⚠️ Segnalazioni da gestire: <b>' || (t ->> 'reports_open') || '</b>' else '' end
    || case when (t ->> 'contacts')::int > 0 then E'\n📇 Contatti invitati: ' || (t ->> 'contacts_invited') || ' su ' || (t ->> 'contacts')
         || ' · hanno aperto l''invito: ' || (t ->> 'contacts_opened') else '' end
    || E'\n\n' || private.setting('site_url') || '/admin.html';
end;
$$;

-- Lanciata ogni ora da pg_cron: invia il riepilogo di ieri all'ora scelta (ora italiana), una volta al giorno
create or replace function private.hourly_job()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  now_it timestamp := now() at time zone 'Europe/Rome';
  today  text := to_char(now_it, 'YYYY-MM-DD');
begin
  if extract(hour from now_it)::int >= coalesce(nullif(private.setting('daily_summary_hour'), '')::int, 8)
     and private.setting('daily_summary_last') <> today then
    update private.settings set value = today where key = 'daily_summary_last';
    perform private.tg_send(private.summary_text((now_it::date - 1)));
  end if;
end;
$$;

create or replace function public.admin_send_summary(p_today boolean default false)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v text;
begin
  perform private.require_admin();
  v := private.summary_text(case when p_today then (now() at time zone 'Europe/Rome')::date
                                 else (now() at time zone 'Europe/Rome')::date - 1 end);
  perform private.tg_send(v);
  return v;
end;
$$;

select cron.unschedule(jobid) from cron.job where jobname = 'sospro24-hourly';
select cron.schedule('sospro24-hourly', '0 * * * *', 'select private.hourly_job()');

-- ---------------------------------------------------------------------
-- PERMESSI
-- ---------------------------------------------------------------------
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig, p.proname
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and (p.proname like 'admin\_%' or p.proname in ('is_admin', 'email_unsubscribe', 'invite_open', 'welcome_start', 'preview_get', 'preview_activate', 'preview_decline'))
  loop
    execute format('revoke all on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
    if f.proname in ('email_unsubscribe', 'invite_open', 'welcome_start', 'preview_get', 'preview_activate', 'preview_decline') then
      execute format('grant execute on function %s to anon', f.sig);
    end if;
  end loop;
end;
$$;
