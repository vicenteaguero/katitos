-- ════════════════════════════════════════════════════════════════════════
-- Katitos — "Georgia" becomes "Summer 2026" (Türkiye → Georgia)
--   • country tag on itinerary items + photos (TR | GE; null = both/unset)
--   • a single optional photo per itinerary item (image_path)
--   • trip_legs: the multi-leg route Istanbul→Trabzon→Batumi→Tbilisi with a
--     transport mode per leg (drawn as polylines on the map)
--   • one-time heal: rename the special trip + tag its existing rows GE so the
--     country switch has sensible data on prod (which has no seed)
--   Additive + idempotent; new table gets the uniform members_all policy.
-- ════════════════════════════════════════════════════════════════════════

alter table public.trip_items
  add column if not exists country text check (country in ('TR', 'GE')),
  add column if not exists image_path text;

alter table public.trip_photos
  add column if not exists country text check (country in ('TR', 'GE'));

create index if not exists trip_items_country_idx on public.trip_items (trip_id, country);

-- Multi-leg route. A leg = a transition between two waypoints with a mode.
create table if not exists public.trip_legs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  position int not null default 0,
  from_label text not null,
  to_label text not null,
  from_lat double precision,
  from_lng double precision,
  to_lat double precision,
  to_lng double precision,
  mode text not null default 'car'
    check (mode in ('car', 'bus', 'flight', 'train', 'ferry', 'walk')),
  country text check (country in ('TR', 'GE')),
  depart_date date,
  note text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
create index if not exists trip_legs_trip_idx on public.trip_legs (trip_id, position);

-- One-time heal: rename the special trip and tag its existing data Georgia.
update public.trips
   set name = 'Summer 2026',
       destination = 'Türkiye → Georgia',
       slug = 'summer-2026',
       start_date = coalesce(start_date, date '2026-07-07'),
       end_date = coalesce(end_date, date '2026-08-04')
 where is_special = true;

update public.trip_items
   set country = 'GE'
 where country is null
   and trip_id in (select id from public.trips where is_special = true);

update public.trip_photos
   set country = 'GE'
 where country is null
   and trip_id in (select id from public.trips where is_special = true);

-- RLS + realtime for trip_legs (mirror the uniform members_all pattern).
alter table public.trip_legs enable row level security;
drop policy if exists members_all on public.trip_legs;
create policy members_all on public.trip_legs
  for all using (public.is_member()) with check (public.is_member());

alter table public.trip_legs replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'trip_legs'
  ) then
    execute 'alter publication supabase_realtime add table public.trip_legs';
  end if;
end $$;
