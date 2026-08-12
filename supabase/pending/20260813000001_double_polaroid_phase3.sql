-- ════════════════════════════════════════════════════════════════════════
-- Katitos — Double Polaroid, PHASE 3 (the switch)
--
--   Drops the old one-photo-per-day constraint. After this, each of us has our
--   own row for our own day and `polaroids_day_user_uniq` is the real rule.
--
--   ⚠ DO NOT RUN THIS UNTIL BOTH PHONES ARE ON THE NEW BUNDLE.
--   The service worker does not skipWaiting, so an old bundle survives at
--   least one session after a deploy, and it:
--     • reads today with .maybeSingle()  → PGRST116 on two rows, which kills
--       the Polaroid route AND the Home widget;
--     • upserts with on_conflict=day     → 42P10 once this constraint is gone,
--       so taking a photo fails outright.
--
--   The gate: both members' couple_members.last_seen_at (or a fresh app_opens
--   row each) must post-date the deploy of the new JS. Checking that is the
--   whole reason this is a separate file.
-- ════════════════════════════════════════════════════════════════════════

alter table public.polaroids drop constraint if exists polaroids_day_key;
