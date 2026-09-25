-- ════════════════════════════════════════════════════════════════════════
-- Katitos - one ledger of things already said
--
--   `habit_reminders` was the streak's note to itself: "I have already told
--   this person about this day". Its `kind` was one of two values because there
--   were two nudges.
--
--   The clock now has more to say - a day closed with money on it, a silent
--   stretch, a pile of bets he has not placed, and eventually a nudge about one
--   habit - and every one of them needs the same "have I said this already"
--   before it fires. One ledger answers that for all of them, so the check comes
--   off and the kind is free text: a habit id, or one of the named ones.
--
--   `habit_nudges` keeps its own job: the TIMES her nudges are planned for.
-- ════════════════════════════════════════════════════════════════════════

alter table public.habit_reminders
  drop constraint if exists habit_reminders_kind_check;

comment on column public.habit_reminders.kind is
  'What was said: day_end, last_call, closed, quiet, unplaced, or habit:<id>.';
