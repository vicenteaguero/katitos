-- ════════════════════════════════════════════════════════════════════════
-- Katitos - the Five has a first day
--
--   The scheduler closes any day whose 3AM has passed and that has no ledger
--   yet, and on its very first tick that was every day in its lookback: seven
--   days she was never asked about, settled as five misses each, $105 burned
--   before the feature existed, and seven identical pushes in one minute.
--
--   So the Five gets a beginning. `started_on` is written once, by whichever
--   comes first - the scheduler's first sight of her, or the first time a dial is
--   touched - and nothing before it is ever settled or shown. It is also the
--   answer to the same question when he retunes the stakes months from now: the
--   day the thing began, not the day the row was last written.
-- ════════════════════════════════════════════════════════════════════════

alter table public.five_settings
  add column if not exists started_on date not null default current_date;

comment on column public.five_settings.started_on is
  'The first day the Five counts. Nothing before it is settled or drawn.';
