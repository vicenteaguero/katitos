-- ════════════════════════════════════════════════════════════════════════
-- Katitos - "what did my Katito add this time?"
--
--   Two columns, deliberately separate:
--
--   • couple_members.changelog_seen_key - per person, "I have read this one".
--     Server-side rather than localStorage so it doesn't re-appear on every
--     device and doesn't vanish when a cache is cleared.
--
--   • couple.changelog_announced_key - one per release, "her push already
--     went out". Sharing the per-member column for this would conflate "I
--     dismissed my own modal" with "the release was announced", which either
--     suppresses her notification or fires it twice.
--
--   Both hold a DIGEST of the newest entry's text, not a version number. That
--   is what makes "if the changelog changes, the modal comes back" true by
--   construction instead of by remembering to bump something.
-- ════════════════════════════════════════════════════════════════════════

alter table public.couple_members
  add column if not exists changelog_seen_key text;

alter table public.couple
  add column if not exists changelog_announced_key text;
