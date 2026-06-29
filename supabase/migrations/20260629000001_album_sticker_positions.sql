-- Album photos become free-floating "stickers": each carries a normalized
-- position (x, y as fractions 0..1 of the page) and a scale, so a sticker sits
-- in the same spot on ANY screen size/aspect (like the chalkboard notes).
alter table public.album_photos
  add column if not exists x real not null default 0.5,
  add column if not exists y real not null default 0.5,
  add column if not exists scale real not null default 1;

-- Spread existing slot-based photos into their old 2x2 quadrants so the switch
-- to free stickers keeps them roughly where they were.
update public.album_photos
set
  x = case when slot % 2 = 0 then 0.31 else 0.69 end,
  y = case when slot < 2 then 0.30 else 0.68 end
where x = 0.5 and y = 0.5;
