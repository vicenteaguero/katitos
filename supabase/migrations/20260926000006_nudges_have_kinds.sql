-- ════════════════════════════════════════════════════════════════════════
-- Katitos - a nudge has a kind, not a goal
--
--   `habit_nudges.goal_id` was the id of one of five fixed goals, or one of the
--   pseudo-ids the sender used to remember a one-off ("_last_call", "_closed").
--   There are no fixed goals any more: a nudge is either about one of her
--   habits, by id, or it is one of those once-a-day things. The column is a
--   kind, and now says so.
-- ════════════════════════════════════════════════════════════════════════

alter table if exists public.habit_nudges rename column goal_id to kind;

comment on table public.habit_nudges is
  'The planned times of her nudges, and the once-only ones already said.';
comment on column public.habit_nudges.kind is
  'A habit id when the nudge is about a habit, else _closed / _quiet / _unplaced.';
