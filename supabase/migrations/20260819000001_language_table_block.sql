-- ════════════════════════════════════════════════════════════════════════
-- Katitos - a lesson can show a table
--
--   Russian has six cases. You cannot teach the accusative with a paragraph;
--   every textbook in existence puts the endings in a grid, and without one
--   she was going to have to photograph a page from a book.
--
--   The grid itself lives in the block's `data`: the cells are Russian word
--   forms, which are the thing being taught rather than something to be
--   translated. Only the column headings ("Nominative", "Plural") get the
--   usual three-language treatment, and they sit in `data` beside the grid.
--
--   Additive and old-bundle-safe: widening a CHECK cannot fail on existing
--   rows, and the previous build simply renders a block kind it does not know
--   as an empty one rather than crashing.
-- ════════════════════════════════════════════════════════════════════════

alter table public.lang_blocks drop constraint if exists lang_blocks_kind_check;
alter table public.lang_blocks
  add constraint lang_blocks_kind_check
  check (kind in ('text', 'vocab', 'media', 'exercise', 'divider', 'table'));
