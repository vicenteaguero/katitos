-- ════════════════════════════════════════════════════════════════════════
-- Katitos - give every album book at least 5 pages.
--   The app seeds pages on first open, but that runs client-side and is cached
--   (staleTime Infinity), so books opened before the change (e.g. Summer Panini
--   showing "1 / 1") never topped up. Seed positions 0–4 for every book here.
--   Idempotent: only inserts a (book, position) pair that's missing.
-- ════════════════════════════════════════════════════════════════════════

insert into public.album_pages (book_id, position)
select b.id, gs.pos
from public.album_books b
cross join generate_series(0, 4) as gs(pos)
where not exists (
  select 1 from public.album_pages p
  where p.book_id = b.id and p.position = gs.pos
);
