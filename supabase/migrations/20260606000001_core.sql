-- ════════════════════════════════════════════════════════════════════════
-- Katitos - core schema
-- The "couple kernel": the two members, shared settings, membership gate,
-- presence, push subscriptions, currency rates. Every feature table later
-- gates on public.is_member().
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- updated_at trigger helper -------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- The single couple (one row) ----------------------------------------------
create table public.couple (
  id boolean primary key default true check (id),
  relationship_start_date date,
  anniversary_day smallint not null default 15, -- monthsversary day-of-month
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger couple_updated_at before update on public.couple
  for each row execute function public.set_updated_at();

-- The two members ----------------------------------------------------------
create table public.couple_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  role text, -- 'a' | 'b'
  emoji text,
  city text,
  country text,
  lat double precision,
  lng double precision,
  timezone text, -- IANA, e.g. 'America/Santiago'
  learning_language text, -- 'ru' | 'es'
  native_language text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger couple_members_updated_at before update on public.couple_members
  for each row execute function public.set_updated_at();

-- Membership gate. SECURITY DEFINER so it bypasses RLS (no policy recursion).
create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.couple_members where user_id = auth.uid()
  );
$$;

-- "The other one" - returns the partner's user_id for the current user.
create or replace function public.partner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select user_id from public.couple_members where user_id <> auth.uid() limit 1;
$$;

-- App-open log (drives "partner opened the app" + last-seen) ----------------
create table public.app_opens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  opened_at timestamptz not null default now()
);
create index app_opens_user_idx on public.app_opens (user_id, opened_at desc);

-- Web-push subscriptions ----------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Currency rates (RUB/CLP/USD …) - refreshed by an Edge Function or by hand.
create table public.currency_rates (
  base text not null,
  quote text not null,
  rate numeric not null check (rate > 0),
  fetched_at timestamptz not null default now(),
  primary key (base, quote)
);

-- RLS -----------------------------------------------------------------------
alter table public.couple enable row level security;
alter table public.couple_members enable row level security;
alter table public.app_opens enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.currency_rates enable row level security;

create policy members_all on public.couple
  for all using (public.is_member()) with check (public.is_member());
create policy members_all on public.couple_members
  for all using (public.is_member()) with check (public.is_member());
create policy members_all on public.app_opens
  for all using (public.is_member()) with check (public.is_member());
create policy members_all on public.push_subscriptions
  for all using (public.is_member()) with check (public.is_member());
create policy members_all on public.currency_rates
  for all using (public.is_member()) with check (public.is_member());

-- Realtime: partner-open events.
alter publication supabase_realtime add table public.app_opens;
alter table public.couple_members replica identity full;
alter publication supabase_realtime add table public.couple_members;
