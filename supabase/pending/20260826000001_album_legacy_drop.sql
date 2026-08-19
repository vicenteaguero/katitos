-- ════════════════════════════════════════════════════════════════════════
-- Katitos — the album's legacy half, removed
--
--   HELD BACK ON PURPOSE. Do not move this into supabase/migrations/ until
--   BOTH gates below are green. `make db-push` applies everything it finds in
--   that folder, which is exactly why this one lives here instead.
--
--   ── Gate 1: both phones are running the release of 19 August 2026 ──
--   `make db-gate SINCE='2026-08-19 00:00+00'` — it takes TWO opens each. The
--   previous bundle still writes a photo the only way it knows how, straight
--   onto album_photos with a page_id and a slot. Drop those columns while it
--   is running and every photo she adds throws.
--
--   ── Gate 2: the adoption code is gone from the app ──
--   `adoptLegacyRows()` in src/features/album/api/photo-book.queries.ts reads
--   page_id and slot on every first open of a book. It must be deleted, and
--   that deletion deployed, before this runs — otherwise opening the album
--   errors on a column that no longer exists.
--
--   Nothing here loses a picture: the placements own the page positions now,
--   and album_chapters / album_slots / album_stickers were the sticker album
--   that no route has mounted since the 3D book replaced it (0 rows in each
--   on production, checked 19 August 2026).
-- ════════════════════════════════════════════════════════════════════════

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
