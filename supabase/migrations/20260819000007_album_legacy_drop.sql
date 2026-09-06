-- ════════════════════════════════════════════════════════════════════════
-- Katitos - the album's legacy half, removed
--
--   `album_photos` used to be both the picture AND its place on a page. Since
--   the library split, `album_placements` owns the position and the photo row
--   is just the photo - but `page_id`, `slot` and the `(page_id, slot)` unique
--   index stayed behind so the previous bundle could keep working during the
--   changeover. That window is closed: the app now updates itself on launch.
--
--   Also gone: `album_chapters` / `album_slots` / `album_stickers`, the sticker
--   album the 3D book replaced. Empty on production, and no route has mounted
--   them for months.
--
--   Nothing loses a picture. Anything still pinned to a page the old way is
--   turned into a placement first, right here - the client-side heal that used
--   to do that (`adoptLegacyRows`) is deleted in this same release, so this
--   cannot be left to it.
-- ════════════════════════════════════════════════════════════════════════

-- ── adopt whatever the old bundle left pinned to a page ───────────────────
-- Deterministic id (the photo's own) so running this twice, or racing the
-- client that used to do it, writes the same row instead of a duplicate.
insert into public.album_placements (
  id, page_id, photo_id, kind, x, y, scale, rotation, z, caption, body, created_by
)
select p.id,
       p.page_id,
       p.id,
       case when p.source = 'text' then 'text' else 'photo' end,
       p.x,
       p.y,
       p.scale,
       p.rotation,
       coalesce(p.slot, 0),
       case when p.source = 'text' then null else p.caption end,
       case when p.source = 'text' then p.caption else null end,
       p.created_by
  from public.album_photos p
 where p.page_id is not null
   and not exists (
     select 1 from public.album_placements pl where pl.photo_id = p.id
   )
on conflict (id) do nothing;

-- ── the legacy pointer on a photo ─────────────────────────────────────────
-- The trigger reads page_id, so it goes first or the column drop fails.
drop trigger if exists album_photos_book_from_page on public.album_photos;
drop function if exists public.album_photo_book_from_page();

-- Kept alive through the whole upgrade window so the old bundle's
-- `upsert(onConflict: 'page_id,slot')` had something to land on.
alter table public.album_photos
  drop constraint if exists album_photos_page_id_slot_key;

alter table public.album_photos
  drop column if exists page_id,
  drop column if exists slot;

-- ── the sticker album that the 3D book replaced ───────────────────────────
drop table if exists public.album_stickers;
drop table if exists public.album_slots;
drop table if exists public.album_chapters;
