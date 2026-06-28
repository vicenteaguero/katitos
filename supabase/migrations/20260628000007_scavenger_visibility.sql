-- ════════════════════════════════════════════════════════════════════════
-- Katitos — Date Cards visibility ("claim to reveal")
--   New model: a card is PRIVATE to its creator until they CLAIM it (the epic
--   reveal). Claiming makes it visible to the partner for review. The partner
--   can cancel the review (dismissed = true) → hidden from them again until the
--   creator re-claims. Unclaiming (deleting the claim) hides it entirely.
--   `dismissed` is the only new bit of state needed.
-- ════════════════════════════════════════════════════════════════════════

alter table public.scavenger_claims
  add column if not exists dismissed boolean not null default false;
