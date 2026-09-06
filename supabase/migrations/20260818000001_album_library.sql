-- ════════════════════════════════════════════════════════════════════════
-- Katitos - the album gets a photo library
--
--   Until now a photo and its place on a page were the same row, so you could
--   not have a photo without first deciding which page it went on. That is why
--   adding twenty holiday pictures meant twenty trips through a sheet, and why
--   "remove" deleted the picture itself - there was nothing else it could mean.
--
--   From here: `album_photos` is the BOOK'S LIBRARY (a photo, once), and the
--   new `album_placements` says where a photo sits on a page. Take a sticker
--   off a page and the photo stays in the library. Put the same photo on two
--   pages and it is two placements of one photo.
--
--   ── Safe while the old bundle is still running ──
--   The service worker does not skipWaiting, so the PREVIOUS build keeps going
--   until the app is opened twice. Everything here is additive:
--     • the old bundle reads `album_pages -> album_photos(*)`; library rows
--       have page_id NULL, so they simply don't come back with any page.
--     • the old bundle upserts on (page_id, slot); that unique index is kept.
--       NULLs are distinct in Postgres, so library rows never collide with it.
--     • nothing is dropped, nothing is renamed.
-- ════════════════════════════════════════════════════════════════════════

-- ── album_photos becomes the library ──────────────────────────────────────
alter table public.album_photos
  add column if not exists book_id uuid references public.album_books (id) on delete cascade,
  -- Natural pixel size, so a sticker can keep its real shape instead of being
  -- cropped square by the CSS, and so the PDF knows what it is drawing.
  add column if not exists width int,
  add column if not exists height int,
  add column if not exists updated_at timestamptz not null default now();

update public.album_photos p
   set book_id = pg.book_id
  from public.album_pages pg
 where pg.id = p.page_id
   and p.book_id is null;

-- A library photo belongs to no page. The old bundle always sends both, so it
-- never notices these became optional.
alter table public.album_photos alter column page_id drop not null;
alter table public.album_photos alter column slot    drop not null;
alter table public.album_photos alter column slot    set default 0;

create index if not exists album_photos_book_idx
  on public.album_photos (book_id, created_at desc);

-- ── where a photo sits on a page ──────────────────────────────────────────
create table if not exists public.album_placements (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.album_pages (id) on delete cascade,
  -- NULL for a text sticker: words are not library photos.
  photo_id uuid references public.album_photos (id) on delete cascade,
  kind text not null default 'photo' check (kind in ('photo', 'text')),
  -- Page fractions (0..1), so a sticker keeps its spot on any screen.
  x real not null default 0.5,
  y real not null default 0.5,
  scale real not null default 1,
  rotation real not null default 0,
  -- A sparse comparator, NOT a CSS z-index: front is max+1, back is min-1, so
  -- bringing one sticker forward never has to renumber the others.
  z int not null default 0,
  frame text not null default 'plain' check (frame in ('plain', 'polaroid')),
  caption text,
  body text,
  font_family text not null default 'display'
    check (font_family in ('display', 'sans', 'hand')),
  -- A FRACTION OF THE PAGE WIDTH, not pixels. The old code stored 16px × scale,
  -- so the same words came out a different size on each of our phones and were
  -- impossible to reproduce when printing.
  font_size real not null default 0.06,
  font_weight int not null default 600 check (font_weight in (400, 600, 700)),
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint album_placements_photo_chk check (kind = 'text' or photo_id is not null)
);

create index if not exists album_placements_page_idx
  on public.album_placements (page_id, z);
create index if not exists album_placements_photo_idx
  on public.album_placements (photo_id);

-- ── everything already on a page becomes a placement ──────────────────────
-- `z` seeds from `slot`, which is exactly today's stacking order (the old
-- screens drew photos sorted by slot), so nothing moves or changes depth.
insert into public.album_placements
  (page_id, photo_id, kind, x, y, scale, rotation, z, frame, caption, body,
   font_size, created_by, created_at)
select p.page_id,
       p.id,
       case when p.source = 'text' then 'text' else 'photo' end,
       p.x, p.y, p.scale, p.rotation,
       coalesce(p.slot, 0),
       'plain',
       case when p.source = 'text' then null else p.caption end,
       case when p.source = 'text' then p.caption else null end,
       -- 16px on the ~333px page this was tuned on ≈ 0.048 of the width.
       case when p.source = 'text' then 0.048 else 0.06 end,
       p.created_by,
       p.created_at
  from public.album_photos p
 where p.page_id is not null
   and not exists (
     select 1 from public.album_placements a where a.photo_id = p.id
   );

-- ── house rules: members do everything, and it arrives live ────────────────
alter table public.album_placements enable row level security;
drop policy if exists members_all on public.album_placements;
create policy members_all on public.album_placements for all
  using (public.is_member()) with check (public.is_member());
alter table public.album_placements replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'album_placements'
  ) then
    alter publication supabase_realtime add table public.album_placements;
  end if;
end $$;

drop trigger if exists album_placements_updated_at on public.album_placements;
create trigger album_placements_updated_at before update on public.album_placements
  for each row execute function public.set_updated_at();

drop trigger if exists album_photos_updated_at on public.album_photos;
create trigger album_photos_updated_at before update on public.album_photos
  for each row execute function public.set_updated_at();
