-- ════════════════════════════════════════════════════════════════════════
-- Katitos - a photo can be cut, cropped and mounted
--
--   Until now a picture on a page was a rectangle, optionally on instant
--   film, showing all of itself. You could not say "just her face", you
--   could not round a corner, and every mount was the same cream plate.
--
--   Three new ideas, all on the PLACEMENT (where the photo sits) and never
--   on the photo itself, so the same picture can be a circle on one page
--   and a full-bleed rectangle on the next, and nothing is ever re-uploaded
--   or lost:
--     • shape  - the cut of the window it shows through
--     • crop   - a focal point and how far in, as fractions
--     • frame  - the mount around it, and what colour that mount is
--
--   ── Safe while the old bundle is still running ──
--   Every column is NOT NULL DEFAULT, so the previous build's inserts -
--   which know nothing about them - still succeed, and its reads simply
--   ignore what they don't recognise. The `frame` check is WIDENED, never
--   narrowed: 'plain' and 'polaroid' stay in the set because the old
--   toggle writes exactly those two.
-- ════════════════════════════════════════════════════════════════════════

alter table public.album_placements
  -- The cut of the window. 'natural' keeps the photograph's own shape.
  add column if not exists shape text not null default 'natural',
  -- The focal point, in the image's own 0..1 space - the same convention
  -- CSS `object-position` uses, so the screen and the printed page can share
  -- one piece of arithmetic instead of two that drift apart.
  add column if not exists crop_x real not null default 0.5,
  add column if not exists crop_y real not null default 0.5,
  -- How far in. Never below 1: under 1 the picture stops covering its own
  -- window and the paper shows through the middle of it.
  add column if not exists crop_zoom real not null default 1,
  -- The mount's colour, for the frames that have a mount.
  add column if not exists frame_color text not null default 'cream';

alter table public.album_placements
  drop constraint if exists album_placements_shape_chk;
alter table public.album_placements add constraint album_placements_shape_chk
  check (shape in ('natural','square','rounded','circle','arch','heart','torn'));

alter table public.album_placements
  drop constraint if exists album_placements_crop_chk;
alter table public.album_placements add constraint album_placements_crop_chk
  check (crop_x >= 0 and crop_x <= 1 and crop_y >= 0 and crop_y <= 1
         and crop_zoom >= 1 and crop_zoom <= 6);

alter table public.album_placements
  drop constraint if exists album_placements_frame_color_chk;
alter table public.album_placements add constraint album_placements_frame_color_chk
  check (frame_color in ('cream','white','gold','wine','ink','kraft'));

-- ── the frame set grows ───────────────────────────────────────────────────
-- By DISCOVERY, not by name: a constraint created by `db reset` locally and
-- one created by an earlier push in production can carry different generated
-- names, and dropping a guessed name silently succeeds while leaving the old
-- two-value check in place - after which every new frame is rejected in prod
-- only. This is the same dance 20260811000003 does for `scope`.
do $$
declare c text;
begin
  select conname into c
    from pg_constraint
   where conrelid = 'public.album_placements'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%frame%'
     and pg_get_constraintdef(oid) not ilike '%frame_color%';
  if c is not null then
    execute format('alter table public.album_placements drop constraint %I', c);
  end if;
end $$;

alter table public.album_placements add constraint album_placements_frame_chk
  check (frame in ('none','plain','white','polaroid','gilt','tape','shadow'));

-- ── the book is made of something ─────────────────────────────────────────
alter table public.album_books
  -- What the cover is bound in, and what the pages are made of.
  add column if not exists cover_material text not null default 'leather',
  add column if not exists paper text not null default 'cream';

alter table public.album_books
  drop constraint if exists album_books_cover_material_chk;
alter table public.album_books add constraint album_books_cover_material_chk
  check (cover_material in ('leather','linen','kraft','velvet'));

alter table public.album_books
  drop constraint if exists album_books_paper_chk;
alter table public.album_books add constraint album_books_paper_chk
  check (paper in ('cream','ivory','kraft','charcoal'));

-- ── a photo carries its own tiny placeholder ──────────────────────────────
-- A ~24px WebP data URI, a few hundred bytes, stored beside the picture so a
-- page is never blank while the real photograph is still being signed for and
-- fetched. It rides along with the page query, so it works offline and on the
-- very first open, which is exactly when a spinner is least welcome.
alter table public.album_photos
  add column if not exists blur text;
