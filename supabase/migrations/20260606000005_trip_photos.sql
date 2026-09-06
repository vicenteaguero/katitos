-- ════════════════════════════════════════════════════════════════════════
-- Katitos - trip photo albums (used by the Georgia hub + travel).
-- Photos live in the 'georgia-album' storage bucket; rows here index them.
-- ════════════════════════════════════════════════════════════════════════

create table public.trip_photos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  image_path text not null,
  caption text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
create index trip_photos_trip_idx on public.trip_photos (trip_id, created_at desc);

alter table public.trip_photos enable row level security;
create policy members_all on public.trip_photos
  for all using (public.is_member()) with check (public.is_member());
