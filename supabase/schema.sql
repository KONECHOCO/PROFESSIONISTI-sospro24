-- =====================================================================
-- SOSPro24 — schema del database (Supabase / PostgreSQL)
-- Come usarlo: Supabase → SQL Editor → New query → incolla tutto → Run.
-- Si può rieseguire: ogni oggetto viene creato solo se non esiste già.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PROFILI (uno per ogni utente registrato, creato in automatico)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 80),
  role              text not null default 'client' check (role in ('client', 'pro')),
  country           text check (country is null or char_length(country) between 2 and 3),
  city              text check (city is null or char_length(city) <= 80),
  accepted_terms_at timestamptz,
  created_at        timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Crea il profilo dai dati inviati in fase di registrazione
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, role, country, city, accepted_terms_at)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)), 80),
    case when new.raw_user_meta_data ->> 'role' = 'pro' then 'pro' else 'client' end,
    left(nullif(new.raw_user_meta_data ->> 'country', ''), 3),
    left(nullif(new.raw_user_meta_data ->> 'city', ''), 80),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- ANNUNCI (visibili a tutti; il telefono sta in una tabella separata)
-- ---------------------------------------------------------------------
create table if not exists public.listings (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name           text not null check (char_length(name) between 2 and 80),
  country        text not null check (char_length(country) between 2 and 3),
  city           text not null check (char_length(city) between 1 and 80),
  zone           text not null check (char_length(zone) between 1 and 80),
  category_id    text not null check (char_length(category_id) <= 40),
  subcategory_id text not null check (char_length(subcategory_id) <= 40),
  title          text not null check (char_length(title) between 3 and 110),
  description    text not null check (char_length(description) between 10 and 800),
  hourly_rate    numeric(8, 2) not null check (hourly_rate > 0 and hourly_rate <= 1000),
  call_out_fee   numeric(8, 2) not null default 0 check (call_out_fee >= 0 and call_out_fee <= 1000),
  currency       text not null default '€' check (char_length(currency) <= 5),
  languages      text[] not null default '{}' check (cardinality(languages) <= 10),
  skills         text[] not null default '{}' check (cardinality(skills) <= 12),
  sos_available  boolean not null default false,
  verified       boolean not null default false,   -- solo l'amministratore può metterlo a true
  status         text not null default 'active' check (status in ('active', 'hidden', 'removed')),
  created_at     timestamptz not null default now()
);

create index if not exists listings_place_idx on public.listings (country, city) where status = 'active';
create index if not exists listings_owner_idx on public.listings (owner_id);

alter table public.listings enable row level security;

drop policy if exists "listings: read active or own" on public.listings;
create policy "listings: read active or own" on public.listings
  for select using (status = 'active' or owner_id = auth.uid());

-- Massimo 5 annunci per utente, mai "verificato" o nascosto alla creazione
drop policy if exists "listings: owner insert" on public.listings;
create policy "listings: owner insert" on public.listings
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and verified = false
    and status = 'active'
    and (select count(*) from public.listings l where l.owner_id = auth.uid()) < 5
  );

drop policy if exists "listings: owner update" on public.listings;
create policy "listings: owner update" on public.listings
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "listings: owner delete" on public.listings;
create policy "listings: owner delete" on public.listings
  for delete to authenticated using (owner_id = auth.uid());

-- ---------------------------------------------------------------------
-- CONTATTI (telefono visibile solo agli utenti registrati)
-- ---------------------------------------------------------------------
create table if not exists public.listing_contacts (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  phone      text not null check (phone ~ '^\+?[0-9 ().-]{8,22}$')
);

alter table public.listing_contacts enable row level security;

drop policy if exists "contacts: read signed-in" on public.listing_contacts;
create policy "contacts: read signed-in" on public.listing_contacts
  for select to authenticated using (true);

drop policy if exists "contacts: owner insert" on public.listing_contacts;
create policy "contacts: owner insert" on public.listing_contacts
  for insert to authenticated
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()));

drop policy if exists "contacts: owner update" on public.listing_contacts;
create policy "contacts: owner update" on public.listing_contacts
  for update to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()));

-- ---------------------------------------------------------------------
-- RECENSIONI (una per utente per annuncio, mai sul proprio annuncio)
-- ---------------------------------------------------------------------
create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references public.listings (id) on delete cascade,
  author_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name   text not null,
  author_role   text not null default 'client' check (author_role in ('client', 'pro')),
  rating        smallint not null check (rating between 1 and 5),
  tags          smallint[] not null default '{}' check (cardinality(tags) <= 6),
  comment       text not null check (char_length(comment) between 3 and 600),
  helpful_count integer not null default 0,
  created_at    timestamptz not null default now(),
  unique (listing_id, author_id)
);

create index if not exists reviews_listing_idx on public.reviews (listing_id);

alter table public.reviews enable row level security;

drop policy if exists "reviews: public read" on public.reviews;
create policy "reviews: public read" on public.reviews for select using (true);

drop policy if exists "reviews: insert not own listing" on public.reviews;
create policy "reviews: insert not own listing" on public.reviews
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and not exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid())
  );

drop policy if exists "reviews: delete own" on public.reviews;
create policy "reviews: delete own" on public.reviews
  for delete to authenticated using (author_id = auth.uid());

-- Nome pubblico e ruolo presi dal profilo (non dal browser): "Maria Rossi" -> "Maria R."
create or replace function public.set_review_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p_name text;
  p_role text;
  parts  text[];
begin
  select name, role into p_name, p_role from public.profiles where id = auth.uid();
  parts := regexp_split_to_array(trim(coalesce(p_name, 'Utente')), '\s+');
  new.author_id     := auth.uid();
  new.author_name   := left(parts[1], 30)
                       || case when array_length(parts, 1) > 1
                               then ' ' || upper(left(parts[array_length(parts, 1)], 1)) || '.'
                               else '' end;
  new.author_role   := coalesce(p_role, 'client');
  new.helpful_count := 0;
  return new;
end;
$$;

drop trigger if exists reviews_set_author on public.reviews;
create trigger reviews_set_author
  before insert on public.reviews
  for each row execute function public.set_review_author();

-- ---------------------------------------------------------------------
-- VOTI "UTILE" (privati; il conteggio è mantenuto sulla recensione)
-- ---------------------------------------------------------------------
create table if not exists public.review_votes (
  review_id  uuid not null references public.reviews (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

alter table public.review_votes enable row level security;

drop policy if exists "votes: read own" on public.review_votes;
create policy "votes: read own" on public.review_votes
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "votes: insert own" on public.review_votes;
create policy "votes: insert own" on public.review_votes
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "votes: delete own" on public.review_votes;
create policy "votes: delete own" on public.review_votes
  for delete to authenticated using (user_id = auth.uid());

create or replace function public.update_helpful_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.reviews set helpful_count = helpful_count + 1 where id = new.review_id;
  elsif tg_op = 'DELETE' then
    update public.reviews set helpful_count = greatest(helpful_count - 1, 0) where id = old.review_id;
  end if;
  return null;
end;
$$;

drop trigger if exists review_votes_count on public.review_votes;
create trigger review_votes_count
  after insert or delete on public.review_votes
  for each row execute function public.update_helpful_count();

-- ---------------------------------------------------------------------
-- SEGNALAZIONI (chiunque può segnalare; le legge solo l'amministratore)
-- ---------------------------------------------------------------------
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid default auth.uid() references auth.users (id) on delete set null,
  listing_id  uuid references public.listings (id) on delete cascade,
  review_id   uuid references public.reviews (id) on delete cascade,
  reason      text check (reason is null or char_length(reason) <= 500),
  created_at  timestamptz not null default now(),
  check (listing_id is not null or review_id is not null)
);

alter table public.reports enable row level security;

drop policy if exists "reports: anyone insert" on public.reports;
create policy "reports: anyone insert" on public.reports
  for insert to anon, authenticated
  with check (reporter_id is null or reporter_id = auth.uid());

-- ---------------------------------------------------------------------
-- LISTA D'ATTESA (clienti che aspettano una professionista nella loro zona)
-- ---------------------------------------------------------------------
create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  country     text not null check (char_length(country) between 2 and 3),
  city        text not null default '' check (char_length(city) <= 80),
  category_id text not null default '' check (char_length(category_id) <= 40),
  lang        text check (lang is null or char_length(lang) <= 5),
  created_at  timestamptz not null default now(),
  unique (email, country, city, category_id)
);

alter table public.waitlist enable row level security;

drop policy if exists "waitlist: anyone insert" on public.waitlist;
create policy "waitlist: anyone insert" on public.waitlist
  for insert to anon, authenticated with check (true);

-- Conteggio pubblico (solo il numero, mai le email)
create or replace function public.waitlist_count(p_country text, p_city text default null, p_category text default null)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int
  from public.waitlist
  where country = p_country
    and (p_city is null or city = p_city)
    and (p_category is null or category_id = p_category);
$$;

-- ---------------------------------------------------------------------
-- PERMESSI: si concede solo ciò che serve (le policy sopra filtrano le righe)
-- ---------------------------------------------------------------------
revoke all on public.profiles, public.listings, public.listing_contacts, public.reviews,
              public.review_votes, public.reports, public.waitlist
  from anon, authenticated;

grant select on public.listings, public.reviews to anon, authenticated;

grant select, update (name, role, country, city) on public.profiles to authenticated;

grant insert, delete on public.listings to authenticated;
-- "verified" e "status" NON sono modificabili dagli utenti
grant update (name, country, city, zone, category_id, subcategory_id, title, description,
              hourly_rate, call_out_fee, currency, languages, skills, sos_available)
  on public.listings to authenticated;

grant select, insert, update on public.listing_contacts to authenticated;
grant insert, delete on public.reviews to authenticated;
grant select, insert, delete on public.review_votes to authenticated;
grant insert on public.reports to anon, authenticated;
grant insert on public.waitlist to anon, authenticated;

revoke execute on function public.waitlist_count(text, text, text) from public;
grant execute on function public.waitlist_count(text, text, text) to anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_review_author() from public, anon, authenticated;
revoke execute on function public.update_helpful_count() from public, anon, authenticated;
