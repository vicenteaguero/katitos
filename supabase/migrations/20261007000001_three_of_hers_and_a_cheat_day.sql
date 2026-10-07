-- ════════════════════════════════════════════════════════════════════════
-- Katitos - three of hers keeps the day, and one day a week is hers to lose
--
--   The streak used to want every daily habit ticked, hers included, and that
--   is five out of five every day from someone who is already tired of being
--   scored. The rule is now:
--
--     a day is kept when his habits are done, we talked, and she held at
--     least three of hers (all of them, if she ever has fewer than three).
--
--   And the hard-day button is gone. What it did now happens by itself: the
--   first day of a Monday-to-Sunday week on which she held fewer than three is
--   her CHEAT DAY. It keeps the streak, and it moves no money at all - no gift
--   for what she did hold, no bet for what she did not. A second short day in
--   the same week is an ordinary miss: it breaks the streak and the bets burn.
--
--   Because a cheat day depends on the days before it in its week, a tick on a
--   Tuesday can change what Thursday was. So a tick now re-settles the rest of
--   its week, not just its own day.
--
--   `hard_days` stays as a table (nothing is deleted), but nothing reads it.
-- ════════════════════════════════════════════════════════════════════════

-- Her side of one day falls short: fewer than three held, or fewer than all of
-- them when she has fewer than three. A day she had no habits on is never short.
create or replace function public.habit_short(p_user uuid, p_day date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select count(*) > 0
     and count(*) filter (where held) < least(3, count(*))
    from public.money_habits(p_user, p_day);
$$;

-- The day her five started. Nothing before it is a cheat day, and nothing
-- before it uses up one: the week of 21 September had her old single habit
-- unticked on Monday, and that Monday must not spend the week's cheat day.
create or replace function public.habit_rule_from()
returns date
language sql
immutable
as $$ select date '2026-09-26' $$;

-- The first short day of its Monday-to-Sunday week, counting from her start.
create or replace function public.habit_cheat_day(p_user uuid, p_day date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_day >= public.habit_rule_from()
     and public.habit_short(p_user, p_day)
     and not exists (
       select 1
         from generate_series(
                greatest(date_trunc('week', p_day)::date,
                         public.habit_rule_from()),
                p_day - 1,
                interval '1 day'
              ) g(d)
        where public.habit_short(p_user, g.d::date)
     );
$$;

revoke execute on function public.habit_short(uuid, date) from public;
revoke execute on function public.habit_cheat_day(uuid, date) from public;
grant execute on function public.habit_short(uuid, date) to authenticated;
grant execute on function public.habit_cheat_day(uuid, date) to authenticated;

-- A cheat day moves nothing. `p_hard` keeps its name so the signature holds;
-- it now means "this is her cheat day", and on one no row is wanted at all.
create or replace function public.money_day_want(
  p_user uuid, p_day date, p_gift integer, p_bet integer, p_hard boolean
)
returns table(habit_id uuid, direction text, amount_cents integer, reason text)
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
   where not p_hard;
$$;

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
  cheat    boolean;
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

  cheat := public.habit_cheat_day(p_user, p_day);

  select not exists (
    (select * from public.money_day_want(p_user, p_day, gift, bet, cheat)
     except
     select habit_id, direction, amount_cents, reason from public.money_ledger
      where user_id = p_user and day = p_day and habit_id is not null)
    union all
    (select habit_id, direction, amount_cents, reason from public.money_ledger
      where user_id = p_user and day = p_day and habit_id is not null
     except
     select * from public.money_day_want(p_user, p_day, gift, bet, cheat))
  ) into same;

  if same then
    return false;
  end if;

  delete from public.money_ledger
   where user_id = p_user and day = p_day and habit_id is not null;
  insert into public.money_ledger
    (user_id, day, habit_id, direction, amount_cents, reason)
  select p_user, p_day, w.habit_id, w.direction, w.amount_cents, w.reason
    from public.money_day_want(p_user, p_day, gift, bet, cheat) w;
  return true;
end;
$$;

-- A tick can move the cheat day later in its week, so settle to the Sunday.
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
      perform public.money_settle_quietly(
        owner, old.day, date_trunc('week', old.day)::date + 6);
    end if;
  end if;
  if tg_op <> 'DELETE' then
    select h.user_id into owner from public.habits h
     where h.id = new.habit_id and h.kind = 'personal';
    if owner is not null
       and (tg_op = 'INSERT' or new.day <> old.day
            or new.habit_id <> old.habit_id) then
      perform public.money_settle_quietly(
        owner, new.day, date_trunc('week', new.day)::date + 6);
    end if;
  end if;
  return null;
end;
$$;

-- A hard day no longer means anything to the money.
drop trigger if exists money_follow_hard_day on public.hard_days;

-- The database's copy of the streak, on the same rule as the app's: his habits
-- and the shared one all ticked, and hers at three or on her cheat day.
create or replace function public.streak_days()
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  max_local date;
  subject   uuid;
  d         date;
  n         integer := 0;
  guard     integer := 0;
  total     integer;
  others_ok boolean;
  complete  boolean;
begin
  select max(date(now() at time zone public.safe_tz(m.timezone)))
    into max_local from public.couple_members m;
  if max_local is null then
    return 0;
  end if;
  select m.user_id into subject
    from public.couple_members m where not m.is_admin limit 1;

  d := max_local;
  loop
    guard := guard + 1;
    exit when guard > 3650;

    select count(*),
           count(*) filter (
             where h.user_id is distinct from subject
               and not exists (
                 select 1 from public.habit_entries e
                  where e.habit_id = h.id and e.day = d
                    and e.revoked_at is null
               )
           ) = 0
      into total, others_ok
      from public.habits h
     where h.schedule = 'daily'
       and h.effective_from <= d
       and (h.archived_at is null or date(h.archived_at) > d);

    complete := total > 0 and others_ok
      and (subject is null
           or not public.habit_short(subject, d)
           or public.habit_cheat_day(subject, d));

    if complete then
      n := n + 1;
    elsif d + 1 >= max_local then
      null;
    else
      exit;
    end if;

    d := d - 1;
  end loop;

  return n;
end;
$$;

-- Every day she has had money on, settled again under the new rule.
select public.money_settle_quietly(s.user_id, s.started_on, null)
  from public.money_settings s;
