-- ════════════════════════════════════════════════════════════════════════
-- Katitos - the money follows the ticks
--
--   Two things were wrong with how her days turned into money.
--
--   1. A day paid out late. The clock settled a day only once it was final on
--      BOTH clocks, and Chile is eleven hours behind Novosibirsk, so her
--      Saturday reached the pots on Monday. She finishes a day, it ends, and
--      nothing moves.
--
--   2. A day, once written, stayed written. A late tick, a tick he took back, a
--      hard day, the money switched off, a habit archived or started earlier:
--      none of it reached the ledger unless he remembered to press a button.
--
--   Now one function, `money_settle_day`, says what a day is worth from the
--   ticks as they stand, and it runs on its own whenever anything that decides
--   it changes, and from the clock the moment her day ends. It compares before
--   it writes, so running it again is free and says nothing on realtime.
--
--   The rule, for one of her days:
--     - nothing before `started_on`, nothing for a day still running on her
--       clock, nothing while the money was off;
--     - each live daily habit of hers: held is her gift, not held is the bet;
--     - a hard day forgives the misses and keeps what she held;
--     - a day keeps the stakes it was first settled at; new stakes are never
--       charged backwards.
-- ════════════════════════════════════════════════════════════════════════

-- "Put away on" is a day on HER clock. Read as a UTC date, a habit archived
-- between her midnight and seven in the morning also left the day that had
-- just ended, and that day was repriced without anybody touching it.
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
    left join public.couple_members m on m.user_id = h.user_id
   where h.user_id = p_user
     and h.kind = 'personal'
     and h.schedule = 'daily'
     and h.effective_from <= p_day
     and (h.archived_at is null
          or date(h.archived_at at time zone public.safe_tz(m.timezone)) > p_day)
   order by h.slot;
$$;

-- What one day should carry, row by row, at the given stakes.
create or replace function public.money_day_want(
  p_user uuid, p_day date, p_gift integer, p_bet integer, p_hard boolean
)
returns table (habit_id uuid, direction text, amount_cents integer, reason text)
language sql
stable
security definer
set search_path = public
as $$
  select m.habit_id,
         case when m.held then 'gift' else 'bet' end,
         case when m.held then p_gift else p_bet end,
         case
           when m.held then 'done'
           -- She said she had and he took it back: not the same as a miss.
           when exists (
             select 1 from public.habit_entries e
              where e.habit_id = m.habit_id and e.day = p_day
           ) then 'revoked'
           else 'missed'
         end
    from public.money_habits(p_user, p_day) m
   where m.held or not p_hard;
$$;

revoke execute on function public.money_day_want(uuid, date, integer, integer, boolean) from public;
revoke execute on function public.money_day_want(uuid, date, integer, integer, boolean) from anon, authenticated;

create or replace function public.money_settle_day(p_user uuid, p_day date)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  s        public.money_settings;
  today    date;
  gift     integer;
  bet      integer;
  hard     boolean;
  same     boolean;
begin
  select * into s from public.money_settings where user_id = p_user;
  if s.user_id is null then
    return false; -- only she has money riding on her days
  end if;

  -- Two writers on one day (her tick and the clock) take turns.
  perform pg_advisory_xact_lock(
    hashtextextended('money:' || p_user::text || ':' || p_day::text, 0)
  );

  select date(now() at time zone public.safe_tz(m.timezone)) into today
    from public.couple_members m where m.user_id = p_user;
  today := coalesce(today, current_date);

  if p_day <= coalesce(s.started_on, '-infinity'::date)
     or p_day >= today
     or public.money_day_paused(p_user, p_day) then
    delete from public.money_ledger
     where user_id = p_user and day = p_day and habit_id is not null;
    return found;
  end if;

  -- The stakes this day was charged at, each on its own: a day she held
  -- everything has no bet row, and that is no reason to reprice her gift.
  select max(amount_cents) filter (where direction = 'gift'),
         max(amount_cents) filter (where direction = 'bet')
    into gift, bet
    from public.money_ledger
   where user_id = p_user and day = p_day and habit_id is not null;
  gift := coalesce(gift, s.gift_cents, 100);
  bet  := coalesce(bet, s.bet_cents, 300);

  hard := exists (
    select 1 from public.hard_days d
     where d.user_id = p_user and d.day = p_day and d.hard_day
  );

  select not exists (
    (select * from public.money_day_want(p_user, p_day, gift, bet, hard)
     except
     select habit_id, direction, amount_cents, reason from public.money_ledger
      where user_id = p_user and day = p_day and habit_id is not null)
    union all
    (select habit_id, direction, amount_cents, reason from public.money_ledger
      where user_id = p_user and day = p_day and habit_id is not null
     except
     select * from public.money_day_want(p_user, p_day, gift, bet, hard))
  ) into same;

  if same then
    return false;
  end if;

  delete from public.money_ledger
   where user_id = p_user and day = p_day and habit_id is not null;
  insert into public.money_ledger
    (user_id, day, habit_id, direction, amount_cents, reason)
  select p_user, p_day, w.habit_id, w.direction, w.amount_cents, w.reason
    from public.money_day_want(p_user, p_day, gift, bet, hard) w;
  return true;
end;
$$;

revoke execute on function public.money_settle_day(uuid, date) from public;
revoke execute on function public.money_settle_day(uuid, date) from anon, authenticated;
grant execute on function public.money_settle_day(uuid, date) to service_role;

-- Every day in a stretch, clamped to the days that can carry money at all.
create or replace function public.money_settle_range(
  p_user uuid, p_from date, p_to date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  s       public.money_settings;
  today   date;
  d       date;
  changed integer := 0;
begin
  select * into s from public.money_settings where user_id = p_user;
  if s.user_id is null or p_from is null then
    return 0;
  end if;
  select date(now() at time zone public.safe_tz(m.timezone)) into today
    from public.couple_members m where m.user_id = p_user;
  today := coalesce(today, current_date);

  d := p_from;
  while d <= least(coalesce(p_to, today), today) loop
    if public.money_settle_day(p_user, d) then
      changed := changed + 1;
    end if;
    d := d + 1;
  end loop;
  return changed;
end;
$$;

revoke execute on function public.money_settle_range(uuid, date, date) from public;
revoke execute on function public.money_settle_range(uuid, date, date) from anon, authenticated;
grant execute on function public.money_settle_range(uuid, date, date) to service_role;

-- A tick must never be lost to the money. If settling throws, the tick stands,
-- the pots are wrong for ten minutes, and the clock puts them right.
create or replace function public.money_settle_quietly(
  p_user uuid, p_from date, p_to date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.money_settle_range(p_user, p_from, p_to);
exception when others then
  raise warning 'money_settle % % %: %', p_user, p_from, p_to, sqlerrm;
end;
$$;

revoke execute on function public.money_settle_quietly(uuid, date, date) from public;
revoke execute on function public.money_settle_quietly(uuid, date, date) from anon, authenticated;

-- ── what moves a day ────────────────────────────────────────────────────

-- A tick, a tick taken back, a tick put back, a tick deleted.
create or replace function public.money_follow_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  if tg_op <> 'INSERT' then
    select h.user_id into owner from public.habits h
     where h.id = old.habit_id and h.kind = 'personal';
    if owner is not null then
      perform public.money_settle_quietly(owner, old.day, old.day);
    end if;
  end if;
  if tg_op <> 'DELETE' then
    select h.user_id into owner from public.habits h
     where h.id = new.habit_id and h.kind = 'personal';
    if owner is not null
       and (tg_op = 'INSERT' or new.day <> old.day
            or new.habit_id <> old.habit_id) then
      perform public.money_settle_quietly(owner, new.day, new.day);
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists money_follow_entry on public.habit_entries;
create trigger money_follow_entry
  after insert or update or delete on public.habit_entries
  for each row execute function public.money_follow_entry();

-- A hard day called, or taken back.
create or replace function public.money_follow_hard_day()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'INSERT' then
    perform public.money_settle_quietly(old.user_id, old.day, old.day);
  end if;
  if tg_op <> 'DELETE' and (tg_op = 'INSERT' or new.day <> old.day
                            or new.user_id <> old.user_id
                            or new.hard_day is distinct from old.hard_day) then
    perform public.money_settle_quietly(new.user_id, new.day, new.day);
  end if;
  return null;
end;
$$;

drop trigger if exists money_follow_hard_day on public.hard_days;
create trigger money_follow_hard_day
  after insert or update or delete on public.hard_days
  for each row execute function public.money_follow_hard_day();

-- The money switched off or on: every day the stretch covers, before and after.
create or replace function public.money_follow_pause()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'INSERT' then
    perform public.money_settle_quietly(old.user_id, old.from_day, old.to_day);
  end if;
  if tg_op <> 'DELETE' then
    perform public.money_settle_quietly(new.user_id, new.from_day, new.to_day);
  end if;
  return null;
end;
$$;

drop trigger if exists money_follow_pause on public.money_pauses;
create trigger money_follow_pause
  after insert or update or delete on public.money_pauses
  for each row execute function public.money_follow_pause();

-- A habit of hers added, archived, brought back, started earlier or later, or
-- turned weekly: every day from the earliest one that could have changed.
-- A deleted habit takes its own rows with it (on delete cascade).
create or replace function public.money_follow_habit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.kind is not distinct from old.kind
     and new.schedule is not distinct from old.schedule
     and new.user_id is not distinct from old.user_id
     and new.effective_from is not distinct from old.effective_from
     and new.archived_at is not distinct from old.archived_at then
    return null; -- a new name or face costs nothing
  end if;

  if tg_op = 'UPDATE' and old.kind = 'personal' then
    perform public.money_settle_quietly(
      old.user_id,
      least(old.effective_from, new.effective_from,
            date(old.archived_at), date(new.archived_at)),
      null
    );
  end if;
  if new.kind = 'personal'
     and (tg_op = 'INSERT' or new.user_id <> old.user_id or old.kind <> 'personal') then
    perform public.money_settle_quietly(new.user_id, new.effective_from, null);
  end if;
  return null;
end;
$$;

drop trigger if exists money_follow_habit on public.habits;
create trigger money_follow_habit
  after insert or update on public.habits
  for each row execute function public.money_follow_habit();

-- Her start moved: the days on either side of it.
create or replace function public.money_follow_start()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.started_on is not distinct from old.started_on then
    return null;
  end if;
  perform public.money_settle_quietly(
    new.user_id,
    least(new.started_on,
          case when tg_op = 'UPDATE' then old.started_on end),
    null
  );
  return null;
end;
$$;

drop trigger if exists money_follow_start on public.money_settings;
create trigger money_follow_start
  after insert or update on public.money_settings
  for each row execute function public.money_follow_start();

-- His "put it right" button, from the app. Same rule now, and it still says
-- how many rows the day carries, which is what the old bundle expects back.
create or replace function public.money_reconcile_day(p_user uuid, p_day date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'only he can put a settled day right' using errcode = '42501';
  end if;
  perform public.money_settle_day(p_user, p_day);
  return (select count(*)::integer from public.money_ledger
           where user_id = p_user and day = p_day and habit_id is not null);
end;
$$;

-- Everything already over, settled by the rule from the start.
select public.money_settle_range(s.user_id, s.started_on, null)
  from public.money_settings s;
