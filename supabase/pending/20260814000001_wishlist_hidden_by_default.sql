-- ════════════════════════════════════════════════════════════════════════
-- Katitos — new wishes are hidden unless you say otherwise
--
--   The column shipped as `default true` so that adding it didn't retroactively
--   hide every existing item from the other one. Now that both phones run a
--   bundle whose add-sheet has the eye control (and defaults it to closed),
--   the database default can match.
--
--   The UI already sends `visible` explicitly on every insert, so this only
--   affects anything writing without it.
-- ════════════════════════════════════════════════════════════════════════

alter table public.wishlist_items alter column visible set default false;
