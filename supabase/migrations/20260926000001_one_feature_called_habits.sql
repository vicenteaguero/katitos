-- ════════════════════════════════════════════════════════════════════════
-- Katitos - one feature, called Habits
--
--   There was never a second thing. There is the streak - her habits, his
--   habits, the call we share - and there is money riding on hers. I built the
--   money as a feature of its own, twice, and the schema still says so: six
--   tables and ten functions with "five" in the name, plus a column on `habits`
--   whose only job was to mark a habit as belonging to the other feature.
--
--   This is the rename that ends it. Nothing about the RULES changes here: every
--   guard, every policy and every sum is the one that shipped, tested, this
--   week. What changes is what things are called and what the ledger is keyed
--   by.
--
--   ── THE ONE REAL CHANGE ─────────────────────────────────────────────────
--   `five_ledger.goal_id text` becomes `money_ledger.habit_id uuid`. The money
--   used to ride on five hard-coded ids; it now rides on HER HABITS, whichever
--   ones he has given her, so the ledger points at the habit itself. The five
--   she started with are just the first five habits, and he can rename or put
--   away any of them without the money losing track.
--
--   Safe to do as a rename rather than a migration: the ledger is empty and the
--   settings table holds one row.
-- ════════════════════════════════════════════════════════════════════════

-- ── the tables say what they are ───────────────────────────────────────────
alter table if exists public.five_settings  rename to money_settings;
alter table if exists public.five_ledger    rename to money_ledger;
alter table if exists public.five_pauses    rename to money_pauses;
alter table if exists public.five_bets      rename to bets;
alter table if exists public.five_days      rename to hard_days;
-- Kept apart from `habit_reminders`, which is the streak's own "have I said
-- this" ledger and has a different shape (a kind, no slot).
alter table if exists public.five_reminders rename to habit_nudges;

alter index if exists five_ledger_goal_uniq  rename to money_ledger_uniq;
alter index if exists five_ledger_bet_uniq   rename to money_ledger_bet_uniq;
alter index if exists five_ledger_day_idx    rename to money_ledger_day_idx;
alter index if exists five_pauses_user_idx   rename to money_pauses_user_idx;
alter index if exists five_pauses_open_uniq  rename to money_pauses_open_uniq;
alter index if exists five_bets_day_idx      rename to bets_day_idx;
alter index if exists five_bets_placed_idx   rename to bets_placed_idx;

-- ── the ledger points at a habit ───────────────────────────────────────────
drop index if exists public.money_ledger_uniq;
-- The payout policy names `goal_id` in its check, so it has to go first. It
-- comes back below, saying the same thing about `habit_id`.
drop policy if exists admin_pays on public.money_ledger;
alter table public.money_ledger drop column if exists goal_id;
alter table public.money_ledger
  add column if not exists habit_id uuid references public.habits (id) on delete cascade;

comment on column public.money_ledger.habit_id is
  'The habit this dollar was about. Null on a bet payout, which is about a bet.';

-- One row per habit per day per direction, exactly as before, keyed by the
-- habit rather than by a name from a list.
create unique index if not exists money_ledger_uniq
  on public.money_ledger (user_id, day, habit_id, direction)
  where habit_id is not null;

-- He pays her out of a bet that came in, and that is still the only row a
-- client may ever put in the ledger.
create policy admin_pays on public.money_ledger
  for insert with check (
    public.is_admin()
    and reason = 'bet_win'
    and direction = 'gift'
    and habit_id is null
    and bet_id is not null
  );

-- `habits.five_goal_id` goes too, but not here: the functions that read it are
-- rewritten in the next migration and it is dropped once they no longer look.
