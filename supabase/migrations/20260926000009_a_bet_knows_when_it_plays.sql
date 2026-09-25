-- ════════════════════════════════════════════════════════════════════════
-- Katitos - a bet knows when it plays
--
--   He logs one on Monday for a match on Thursday morning. Nothing in the app
--   knew that, so the result only ever got filled in when he happened to open
--   the page and remember - and a bet nobody settles makes the whole log a
--   guess, which is the one thing this log is not allowed to be.
--
--   `kickoff` is when the match starts, his clock. Two hours after it, the
--   Habits tick asks HIM for the result, once, and keeps asking every day until
--   the bet is settled or voided.
-- ════════════════════════════════════════════════════════════════════════

alter table public.bets
  add column if not exists kickoff timestamptz;

comment on column public.bets.kickoff is
  'When the match starts. The clock asks him for the result two hours after it.';

-- The clock reads exactly this: still riding, and it has already played.
create index if not exists bets_kickoff_open_idx
  on public.bets (kickoff)
  where status = 'open' and kickoff is not null;
