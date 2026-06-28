-- ════════════════════════════════════════════════════════════════════════
-- Katitos — shared 3D photo-book engine (Pololini + Summer Panini)
--   One engine, two instances:
--     • scope 'life' → Pololini (year-round, one book)
--     • scope 'trip' → Summer Panini (one book per trip)
--   A book has ordered pages; a page holds up to 4 photos (slot 0–3). Photos
--   are uploaded from the phone OR reference an existing polaroid.
--   New tables get the uniform members_all policy + live sync.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.album_books (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'life' check (scope in ('life', 'trip')),
  trip_id uuid references public.trips (id) on delete cascade,
  title text not null default 'Our album',
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
-- At most one life book; at most one book per trip.
create unique index if not exists album_books_life_uniq
  on public.album_books (scope) where scope = 'life';
create unique index if not exists album_books_trip_uniq
  on public.album_books (trip_id) where trip_id is not null;

create table if not exists public.album_pages (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.album_books (id) on delete cascade,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists album_pages_book_idx
  on public.album_pages (book_id, position);

create table if not exists public.album_photos (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.album_pages (id) on delete cascade,
  slot smallint not null check (slot between 0 and 3),
  image_path text,
  caption text,
  source text not null default 'upload' check (source in ('upload', 'polaroid')),
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  unique (page_id, slot)
);

do $$
declare t text;
begin
  foreach t in array array['album_books', 'album_pages', 'album_photos'] loop
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
