-- ════════════════════════════════════════════════════════════════════════
-- Katitos — Summer Travel: Reviews + Budget sprints
--   • trip_reviews: rate places (restaurant/airbnb/car/museum/view/food/…)
--     1–5 stars, notes, link, one photo, optional map coords.
--   • budget_sprints + budget_lines: money grouped by period (anchor date),
--     coarse planned-vs-spent, per currency. No receipts.
--   New tables get the uniform members_all policy + live sync.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.trip_reviews (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  country text check (country in ('TR', 'GE')),
  category text not null default 'other'
    check (category in ('restaurant', 'airbnb', 'car', 'museum', 'view',
                        'food', 'shop', 'other')),
  name text not null,
  stars smallint check (stars between 1 and 5),
  notes text,
  link text,
  image_path text,
  lat double precision,
  lng double precision,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trip_reviews_idx
  on public.trip_reviews (trip_id, country, category);
create trigger trip_reviews_updated_at before update on public.trip_reviews
  for each row execute function public.set_updated_at();

-- A sprint = a named period, anchored to a date boundary.
create table if not exists public.budget_sprints (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null,
  anchor_date date,
  position int not null default 0,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
create index if not exists budget_sprints_trip_idx
  on public.budget_sprints (trip_id, position);

-- One money line per (category × currency) inside a sprint.
create table if not exists public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  sprint_id uuid not null references public.budget_sprints (id) on delete cascade,
  label text,
  currency text not null default 'USD',
  planned_amount numeric not null default 0 check (planned_amount >= 0),
  spent_amount numeric not null default 0 check (spent_amount >= 0),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists budget_lines_sprint_idx
  on public.budget_lines (sprint_id, position);

-- RLS + realtime, uniform members_all.
do $$
declare t text;
begin
  foreach t in array array['trip_reviews', 'budget_sprints', 'budget_lines'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists members_all on public.%I;', t);
    execute format(
      'create policy members_all on public.%I for all using (public.is_member()) with check (public.is_member());',
      t);
    execute format('alter table public.%I replica identity full;', t);
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
