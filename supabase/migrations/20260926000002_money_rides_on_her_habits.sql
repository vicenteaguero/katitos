-- ════════════════════════════════════════════════════════════════════════
-- Katitos - the money rides on her habits
--
--   Every function here is the one that already shipped, with two differences:
--   it is named for Habits rather than for a feature that no longer exists, and
--   where it used to walk five hard-coded ids it now walks HER LIVE DAILY
--   HABITS for that day.
--
--   Daily ones only, deliberately. A weekly habit cannot be "missed" on any
--   particular day - that is the whole point of it - so putting three dollars on
--   a Tuesday it was never owed would be inventing a debt. It still counts for
--   the streak, as it always did.
--
--   The rules are unchanged and their tests are unchanged: a settled day keeps
--   the stakes it was settled at, a hard day forgives the misses and keeps what
--   she held, a paused day has no money on it and never will, and only he may
--   rewrite a day that is already closed.
-- ════════════════════════════════════════════════════════════════════════

-- ── her habits, for a given day ────────────────────────────────────────────
-- One definition, used by the settle, the correction and the hard-day rule, so
-- "what counts" can never mean two things.
create or replace function public.money_habits(p_user uuid, p_day date)
returns table (habit_id uuid, held boolean)
language sql
stable
security definer
set search_path = public
as $$
  select h.id,
         exists (
           select 1 from public.habit_entries e
            where e.habit_id = h.id and e.day = p_day
              and e.revoked_at is null
         )
    from public.habits h
   where h.user_id = p_user
     and h.kind = 'personal'
     and h.schedule = 'daily'
     and h.effective_from <= p_day
     and (h.archived_at is null or date(h.archived_at) > p_day)
   order by h.slot;
$$;

revoke execute on function public.money_habits(uuid, date) from public;
grant execute on function public.money_habits(uuid, date) to authenticated;

-- ── the pots ───────────────────────────────────────────────────────────────
create or replace function public.money_pots(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'gift_cents', coalesce((
      select sum(amount_cents) from public.money_ledger
       where user_id = p_user and direction = 'gift'), 0),
    'bet_cents', coalesce((
      select sum(amount_cents) from public.money_ledger
       where user_id = p_user and direction = 'bet'), 0),
    'staked_cents', coalesce((
      select sum(stake_cents) from public.bets where status <> 'void'), 0),
    'lost_cents', coalesce((
      select sum(stake_cents) from public.bets where status = 'lost'), 0),
    'won_cents', coalesce((
      select sum(coalesce(payout_cents, 0)) from public.bets
       where status = 'won'), 0),
    'open_cents', coalesce((
      select sum(stake_cents) from public.bets where status = 'open'), 0)
  ) where public.is_member();
$$;

revoke execute on function public.money_pots(uuid) from public;
grant execute on function public.money_pots(uuid) to authenticated;

-- ── was it switched off that day? ──────────────────────────────────────────
create or replace function public.money_day_paused(p_user uuid, p_day date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.money_pauses p
     where p.user_id = p_user
       and p.from_day <= p_day
       and (p.to_day is null or p.to_day >= p_day)
  );
$$;

revoke execute on function public.money_day_paused(uuid, date) from public;
grant execute on function public.money_day_paused(uuid, date) to authenticated;

-- ── putting a settled day right ────────────────────────────────────────────
create or replace function public.money_reconcile_day(p_user uuid, p_day date)
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
  r       record;
  ever    boolean;
begin
  if not public.is_admin() then
    raise exception 'only he can put a settled day right' using errcode = '42501';
  end if;

  closed := not public.habit_day_open(p_day, p_user);

  settled := exists (
    select 1 from public.money_ledger
     where user_id = p_user and day = p_day and habit_id is not null
  );

  if not settled and not closed then
    return 0; -- an open day needs nothing; the tick will write it at the close
  end if;

  if public.money_day_paused(p_user, p_day) then
    delete from public.money_ledger
     where user_id = p_user and day = p_day and habit_id is not null;
    return 0;
  end if;

  -- The price of THIS day, as it was charged - never today's dials.
  select max(amount_cents) filter (where direction = 'gift'),
         max(amount_cents) filter (where direction = 'bet')
    into gift, bet
    from public.money_ledger
   where user_id = p_user and day = p_day and habit_id is not null;

  if gift is null or bet is null then
    select coalesce(s.gift_cents, 100), coalesce(s.bet_cents, 300)
      into gift, bet
      from public.money_settings s where s.user_id = p_user;
  end if;
  gift := coalesce(gift, 100);
  bet  := coalesce(bet, 300);

  select coalesce(d.hard_day, false) into hard
    from public.hard_days d where d.user_id = p_user and d.day = p_day;
  hard := coalesce(hard, false);

  delete from public.money_ledger
   where user_id = p_user and day = p_day and habit_id is not null;

  for r in select * from public.money_habits(p_user, p_day) loop
    -- Did she ever say she had done it? That is the difference between a miss
    -- and something he took back.
    select exists (
      select 1 from public.habit_entries e
       where e.habit_id = r.habit_id and e.day = p_day
    ) into ever;

    if not r.held and hard then
      continue; -- a hard day forgives the misses and keeps what she held
    end if;

    insert into public.money_ledger
      (user_id, day, habit_id, direction, amount_cents, reason)
    values (
      p_user, p_day, r.habit_id,
      case when r.held then 'gift' else 'bet' end,
      case when r.held then gift else bet end,
      case when r.held then 'done' when ever then 'revoked' else 'missed' end
    );
    written := written + 1;
  end loop;

  return written;
end;
$fn$;

revoke execute on function public.money_reconcile_day(uuid, date) from public;
grant execute on function public.money_reconcile_day(uuid, date) to authenticated;

-- ── a payout can be taken back ─────────────────────────────────────────────
create or replace function public.money_unpay_bet(p_bet uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  removed integer;
begin
  if not public.is_admin() then
    raise exception 'only he settles a bet' using errcode = '42501';
  end if;

  delete from public.money_ledger
   where bet_id = p_bet and reason = 'bet_win';
  get diagnostics removed = row_count;
  return removed;
end;
$fn$;

revoke execute on function public.money_unpay_bet(uuid) from public;
grant execute on function public.money_unpay_bet(uuid) to authenticated;

-- ── the dials are his, the switch is hers ──────────────────────────────────
create or replace function public.money_settings_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.user_id <> auth.uid() then
    raise exception 'those are not your stakes' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    new.gift_cents := 100;
    new.bet_cents  := 300;
    return new;
  end if;

  new.gift_cents := old.gift_cents;
  new.bet_cents  := old.bet_cents;
  new.started_on := old.started_on;
  return new;
end;
$fn$;

drop trigger if exists five_settings_guard on public.money_settings;
drop trigger if exists money_settings_guard on public.money_settings;
create trigger money_settings_guard
  before insert or update on public.money_settings
  for each row execute function public.money_settings_guard();

-- ── the switch keeps the record ────────────────────────────────────────────
create or replace function public.money_pause_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  zone  text;
  today date;
begin
  if tg_op = 'UPDATE' and old.active is not distinct from new.active then
    return new;
  end if;

  select public.safe_tz(m.timezone) into zone
    from public.couple_members m where m.user_id = new.user_id;
  today := (now() at time zone coalesce(zone, 'UTC'))::date;

  if not new.active then
    insert into public.money_pauses (user_id, from_day)
    values (new.user_id, today)
    on conflict do nothing;
  else
    update public.money_pauses
       set to_day = today
     where user_id = new.user_id and to_day is null;
  end if;

  return new;
end;
$fn$;

drop trigger if exists five_settings_pause_log on public.money_settings;
drop trigger if exists money_pause_log on public.money_settings;
create trigger money_pause_log
  after insert or update on public.money_settings
  for each row execute function public.money_pause_log();

-- ── a hard day is for a hard day ───────────────────────────────────────────
create or replace function public.hard_day_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  total  integer;
  held   integer;
begin
  if tg_op = 'DELETE' then
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

  if new.day > (
    select date(now() at time zone public.safe_tz(m.timezone))
      from public.couple_members m where m.user_id = new.user_id
  ) then
    raise exception 'that day has not happened yet' using errcode = 'P0001';
  end if;

  if new.user_id <> auth.uid() then
    raise exception 'that is not your day' using errcode = 'P0001';
  end if;

  if not public.habit_day_open(new.day, auth.uid()) then
    raise exception 'that day is closed' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.hard_days d
     where d.user_id = new.user_id and d.hard_day
       and d.day <> new.day and d.day > new.day - 7
  ) then
    raise exception 'one hard day a week' using errcode = 'P0003';
  end if;

  -- And the day has to be going badly: three or more of hers still missing.
  select count(*), count(*) filter (where held)
    into total, held
    from public.money_habits(new.user_id, new.day);

  if coalesce(total, 0) - coalesce(held, 0) < 3 then
    raise exception 'today is going too well for that' using errcode = 'P0004';
  end if;

  return new;
end;
$fn$;

drop trigger if exists five_days_hard_day on public.hard_days;
drop trigger if exists hard_day_guard on public.hard_days;
create trigger hard_day_guard
  before insert or update or delete on public.hard_days
  for each row execute function public.hard_day_guard();

-- ── her first habits ───────────────────────────────────────────────────────
-- The five she asked for, in her order, created as ordinary habits he can
-- rename or put away afterwards. Idempotent, so the button is safe to press
-- twice.
create or replace function public.seed_her_habits(p_user uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  made integer := 0;
  g    record;
begin
  if not public.is_admin() then
    raise exception 'only he sets her habits' using errcode = '42501';
  end if;

  for g in
    select * from (values
      ('Sleep', '🌙'),
      ('Study', '📚'),
      ('Eat well', '🍲'),
      ('Work', '💼'),
      ('Walk or train', '🏃')
    ) as t(title, emoji)
  loop
    if exists (
      select 1 from public.habits h
       where h.user_id = p_user and h.archived_at is null
         and lower(h.title) = lower(g.title)
    ) then
      continue;
    end if;

    insert into public.habits
      (user_id, kind, title, emoji, schedule, effective_from)
    values (p_user, 'personal', g.title, g.emoji, 'daily', current_date);
    made := made + 1;
  end loop;

  return made;
end;
$fn$;

revoke execute on function public.seed_her_habits(uuid) from public;
grant execute on function public.seed_her_habits(uuid) to authenticated;
