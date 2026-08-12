-- ════════════════════════════════════════════════════════════════════════
-- Katitos — one page per position, per book
--
--   `ensurePages()` in the client seeds a new book with five pages and catches
--   23505 to survive both of us opening it at once. That catch never fired,
--   because no unique constraint existed — so a simultaneous first open would
--   quietly create duplicate leaves in the flip book.
--
--   Verified empty before adding (no (book_id, position) pair had count > 1).
-- ════════════════════════════════════════════════════════════════════════

create unique index if not exists album_pages_book_position_uniq
  on public.album_pages (book_id, position);
