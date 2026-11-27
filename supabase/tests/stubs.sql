-- Finti oggetti di Supabase per provare schema.sql + admin.sql su PGlite
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  created_at timestamptz default now(),
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz,
  banned_until timestamptz,
  raw_user_meta_data jsonb default '{}'
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create schema extensions;
create schema vault;
create table vault.secrets (id uuid primary key default gen_random_uuid(), name text unique, secret text, description text);
create view vault.decrypted_secrets as select id, name, secret as decrypted_secret from vault.secrets;
create function vault.create_secret(new_secret text, new_name text default null, new_description text default '') returns uuid
language sql as $$ insert into vault.secrets (secret, name, description) values (new_secret, new_name, new_description) returning id $$;
create function vault.update_secret(secret_id uuid, new_secret text default null, new_name text default null, new_description text default null) returns void
language sql as $$ update vault.secrets set secret = coalesce(new_secret, secret) where id = secret_id $$;

create schema net;
create table net._http_response (id bigserial, created timestamptz default now());
create table net.log (id bigserial primary key, url text, body jsonb, headers jsonb, at timestamptz default now());
create function net.http_post(url text, body jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000) returns bigint
language sql as $$ insert into net.log (url, body, headers) values (url, body, headers) returning id $$;

create schema cron;
create table cron.job (jobid bigserial primary key, jobname text, schedule text, command text);
create function cron.schedule(n text, s text, c text) returns bigint language sql as $$ insert into cron.job (jobname, schedule, command) values (n, s, c) returning jobid $$;
create function cron.unschedule(id bigint) returns boolean language sql as $$ delete from cron.job where jobid = id returning true $$;

-- pgsql-http finto: risposte preparate in base all'indirizzo
create type extensions.http_header as (field varchar, value varchar);
create type extensions.http_request as (method text, uri varchar, headers extensions.http_header[], content_type varchar, content varchar);
create type extensions.http_response as (status integer, content_type varchar, headers extensions.http_header[], content varchar);
create function extensions.http_header(field varchar, value varchar) returns extensions.http_header
language sql as $$ select row(field, value)::extensions.http_header $$;
create function extensions.http_set_curlopt(a varchar, b varchar) returns boolean language sql as $$ select true $$;
create table public.http_log (id bigserial primary key, method text, uri text, headers text, content text);
create table public.http_fail (uri_like text);
create function extensions.http(r extensions.http_request) returns extensions.http_response
language plpgsql as $$
declare
  new_id uuid;
  b jsonb;
begin
  insert into public.http_log (method, uri, headers, content) values (r.method, r.uri, r.headers::text, r.content);
  if exists (select 1 from public.http_fail where r.uri like uri_like) then
    return row(403, 'application/json', null, '{"errors":[{"message":"forbidden test"}]}')::extensions.http_response;
  end if;
  if r.uri like '%/auth/v1/admin/users' and r.method = 'POST' then
    b := r.content::jsonb;
    insert into auth.users (email, email_confirmed_at, raw_user_meta_data) values (b ->> 'email', now(), b -> 'user_metadata') returning id into new_id;
    return row(200, 'application/json', null, json_build_object('id', new_id)::text)::extensions.http_response;
  elsif r.uri like '%/auth/v1/admin/users/%' and r.method = 'PUT' then
    b := r.content::jsonb;
    if b ? 'ban_duration' then
      update auth.users set banned_until = case when b ->> 'ban_duration' = 'none' then null else now() + interval '100 years' end
       where id = split_part(r.uri, '/admin/users/', 2)::uuid;
    end if;
    if b ? 'email' then
      update auth.users set email = b ->> 'email' where id = split_part(r.uri, '/admin/users/', 2)::uuid;
    end if;
    return row(200, 'application/json', null, '{}')::extensions.http_response;
  elsif r.uri like '%/admin/generate_link' then
    return row(200, 'application/json', null, '{"action_link":"https://example.supabase.co/auth/v1/verify?token=abc&type=recovery"}')::extensions.http_response;
  elsif r.uri like 'https://api.sendgrid.com/%' then
    return row(202, 'text/plain', null, '')::extensions.http_response;
  elsif r.uri like 'https://api.telegram.org/%/getUpdates' then
    return row(200, 'application/json', null, '{"ok":true,"result":[{"update_id":4,"message":{"chat":{"id":111,"first_name":"Vecchio"}}},{"update_id":5,"message":{"chat":{"id":12345,"first_name":"Inza"}}}]}')::extensions.http_response;
  end if;
  return row(404, 'text/plain', null, 'not found')::extensions.http_response;
end;
$$;

create function extensions.gen_random_bytes(n int) returns bytea language sql as $$ select decode(substr(md5(random()::text) || md5(random()::text) || md5(random()::text), 1, n * 2), 'hex') $$;
create function extensions.hmac(data text, key text, algo text) returns bytea language sql immutable as $$ select sha256(convert_to(key || ':' || data, 'UTF8')) $$;
