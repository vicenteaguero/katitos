-- ════════════════════════════════════════════════════════════════════════
-- Katitos - the loose ends around the Five's money
--
--   Five things, all found by reading the schema back rather than the screens.
--
--   1. A hard day that ended with nothing held leaves no ledger rows at all,
--      which is correct - nothing moved - but it also means "never settled". Undo
--      the hard day afterwards and reconcile finds nothing to put right and walks
--      away, so the day keeps its zero forever once the scheduler's week-long
--      look back has passed it. Reconcile now settles a closed day that was never
--      settled, instead of only rewriting one that was.
--
--   2. Reconcile wrote `reason = 'revoked'` for every miss, including goals she
--      never marked at all. The money was right and the word was a lie, and it
--      is the column that is supposed to answer "what did he take back".
--
--   3. `five_days` had no DELETE guard, so she could delete a hard day - erasing
--      the note with it - and have the once-a-week valve back the same evening.
--
--   4. `admin_pays` let him insert any ledger row at all as long as it said
--      `bet_win`: any direction, any amount, any user, and a null `bet_id`, which
--      the partial unique index does not cover. It says what it means now.
--
--   5. Two indexes that nothing can use, and one table sorted by a column it is
--      not indexed on.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1 and 2. reconcile settles a closed day, and names a miss a miss ───────
create or replace function public.five_reconcile_day(p_user uuid, p_day date)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  gift    integer;
  bet     integer;
  hard    boolean;
  closed  boolean;
  settled boolean;
  written integer := 0;
  g       text;
  live    boolean;
  ever    boolean;
  zone    text;
begin
  if not public.is_admin() then
    raise exception 'only he can put a settled day right' using errcode = '42501';
  end if;

  select public.safe_tz(m.timezone) into zone
    from public.couple_members m where m.user_id = p_user;
  -- The same instant her window shuts, and the same one the scheduler settles on.
  closed := now() > ((p_day + 1)::timestamp + interval '3 hours')
                    at time zone coalesce(zone, 'UTC');

  settled := exists (
    select 1 from public.five_ledger
     where user_id = p_user and day = p_day and goal_id is not null
  );

  -- An open day needs nothing: the scheduler will write it at 3AM from exactly
  -- this arithmetic. A closed day that was never settled - a hard day where she
  -- held nothing, then undone - has to be settled here or nowhere.
  if not settled and not closed then
    return 0;
  end if;

  if public.five_day_paused(p_user, p_day) then
    delete from public.five_ledger
     where user_id = p_user and day = p_day and goal_id is not null;
    return 0;
  end if;

  -- The price of THIS day, as it was charged - never today's dials.
  select max(amount_cents) filter (where direction = 'gift'),
         max(amount_cents) filter (where direction = 'bet')
    into gift, bet
    from public.five_ledger
   where user_id = p_user and day = p_day and goal_id is not null;

  if gift is null or bet is null then
    select coalesce(s.gift_cents, 100), coalesce(s.bet_cents, 300)
      into gift, bet
      from public.five_settings s where s.user_id = p_user;
  end if;
  gift := coalesce(gift, 100);
  bet  := coalesce(bet, 300);

  select coalesce(d.hard_day, false) into hard
    from public.five_days d where d.user_id = p_user and d.day = p_day;
  hard := coalesce(hard, false);

  delete from public.five_ledger
   where user_id = p_user and day = p_day and goal_id is not null;

  foreach g in array array['sleep', 'work', 'study', 'eat', 'move'] loop
    select exists (
      select 1 from public.five_marks m
       where m.user_id = p_user and m.day = p_day and m.goal_id = g
         and m.revoked_at is null
    ) into live;
    -- Did she ever say she had done it? That is the difference between a miss
    -- and something he took back.
    select exists (
      select 1 from public.five_marks m
       where m.user_id = p_user and m.day = p_day and m.goal_id = g
    ) into ever;

    if not live and hard then
      continue; -- a hard day forgives the misses and keeps what she held
    end if;

    insert into public.five_ledger
      (user_id, day, goal_id, direction, amount_cents, reason)
    values (
      p_user, p_day, g,
      case when live then 'gift' else 'bet' end,
      case when live then gift else bet end,
      case when live then 'done' when ever then 'revoked' else 'missed' end
    );
    written := written + 1;
  end loop;

  return written;
end;
$fn$;

-- ── 3. a hard day cannot be deleted out from under its own rule ────────────
create or replace function public.five_guard_hard_day()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if tg_op = 'DELETE' then
    -- Deleting the row erases the note and hands back the week's valve. He can;
    -- she talks to him.
    if auth.uid() is not null and not public.is_admin() and old.hard_day then
      raise exception 'a hard day stays' using errcode = 'P0003';
    end if;
    return old;
  end if;

  if not new.hard_day then
    return new;
  end if;
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if exists (
    select 1 from public.five_days d
     where d.user_id = new.user_id
       and d.hard_day
       and d.day <> new.day
       and d.day > new.day - 7
  ) then
    raise exception 'one hard day a week' using errcode = 'P0003';
  end if;
  return new;
end;
$fn$;

drop trigger if exists five_days_hard_day on public.five_days;
create trigger five_days_hard_day
  before insert or update or delete on public.five_days
  for each row execute function public.five_guard_hard_day();

drop trigger if exists five_days_window on public.five_days;
create trigger five_days_window
  before insert or update or delete on public.five_days
  for each row execute function public.five_guard_window();

-- ── 4. the payout policy says what it means ────────────────────────────────
drop policy if exists admin_pays on public.five_ledger;
create policy admin_pays on public.five_ledger
  for insert with check (
    public.is_admin()
    and reason = 'bet_win'
    and direction = 'gift'
    and goal_id is null
    and bet_id is not null
  );

-- ── 5. indexes nothing can use ─────────────────────────────────────────────
-- `five_reminders` is only ever read by user and day, which the primary key
-- already answers; `five_marks_day_idx` duplicates the PK prefix; and the bets
-- list sorts by `placed_at`, which had no index at all.
drop index if exists public.five_reminders_slot_idx;
drop index if exists public.five_marks_day_idx;
create index if not exists five_bets_placed_idx
  on public.five_bets (placed_at desc);

-- ── live ───────────────────────────────────────────────────────────────────
-- A pause or a retune on one phone should reach the other, like everything else.
do $realtime$
declare t text;
begin
  foreach t in array array['five_settings', 'five_pauses'] loop
    execute format('alter table public.%I replica identity full;', t);
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$realtime$;
