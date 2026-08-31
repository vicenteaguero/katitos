-- Drop the tables behind the features deleted on 2026-08-30.
--
-- GATE: this file lives in supabase/pending/ on purpose. `make db-push` applies
-- everything in supabase/migrations/, so moving this file is the whole decision.
-- Do not move it until you are certain: dropping a table cannot be undone, and
-- these tables ARE the only copy of anything ever written to them.
--
-- Checked on production 2026-08-30 with exact count(*), not n_live_tup: every
-- table below held 0 rows. The code that read and wrote them is gone.
--
-- NOT dropped, because their features are still shipped-but-locked:
--   dates, date_photos, date_ratings   (dates)
--   decks, deck_cards, deck_responses  (quizzes)
--   tree_state, tree_waterings, tree_milestones (tree)

begin;

-- Tier B — real concepts we did not come back to.
drop table if exists public.decision_positions;
drop table if exists public.decisions;
drop table if exists public.finance_contributions;
drop table if exists public.finance_goals;
drop table if exists public.fights;
drop table if exists public.game_scores;

-- Tier C — the same list, written five times.
drop table if exists public.countdowns;
drop table if exists public.cute_words;
drop table if exists public.ideas;
drop table if exists public.punitos;
drop table if exists public.baby_name_votes;
drop table if exists public.baby_names;

-- Long dead: the scavenger feature stopped reading this well before today.
drop table if exists public.scavenger_arguments;

commit;

-- Storage buckets are NOT dropped here. `dates-album` and `quiz-media` still
-- belong to living features. No bucket is orphaned by this migration.
