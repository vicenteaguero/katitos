-- Stickers are free-positioned now; `slot` is just a per-page sequence id, not
-- a 0..3 grid cell — so the old grid bound must go (otherwise the 5th sticker
-- on a page fails the check).
alter table public.album_photos
  drop constraint if exists album_photos_slot_check;
