-- ════════════════════════════════════════════════════════════════════════
-- Katitos - "Date cards" game (the secret-dates envelope deck for Georgia)
--   • each card gets a photo of the physical card (card_image_path)
--   • completion: either partner uploads the date photo (existing image_path)
--   • rating: ONLY the non-owner stars the date 1–3 (free), from a shared
--     40-star pot. The owner can't score their own deck.
--   • accept: the owner accepts the stars → the rating locks, final forever.
-- Columns are additive; RLS already covers both tables (members_all).
-- ════════════════════════════════════════════════════════════════════════

alter table public.scavenger_cards
  add column if not exists card_image_path text;

alter table public.scavenger_claims
  add column if not exists stars smallint check (stars between 1 and 3),
  add column if not exists rated_by uuid references auth.users (id),
  add column if not exists rated_at timestamptz,
  add column if not exists accepted boolean not null default false;
