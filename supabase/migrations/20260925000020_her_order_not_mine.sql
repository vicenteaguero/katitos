-- ════════════════════════════════════════════════════════════════════════
-- Katitos - her order, not the one I guessed
--
--   Sleep, the book, the plate, the work, the walk. I had guessed work second
--   and eating fourth, which is not how she reads her own day.
--
--   Nothing about the money changes: every one of these lists is a set being
--   walked, so the order only ever decided what comes out first - the order the
--   five habits are created in, and so the order they sit on the streak's shelf,
--   which is the one that shows.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.five_adopt_habits(p_user uuid)
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
    raise exception 'only he opens the Five' using errcode = '42501';
  end if;

  for g in
    select * from (values
      ('sleep', 'Sleep', '🌙'),
      ('study', 'Study', '📚'),
      ('eat',   'Eat well', '🍲'),
      ('work',  'Work',  '💼'),
      ('move',  'Walk or train', '🏃')
    ) as t(goal_id, title, emoji)
  loop
    if exists (
      select 1 from public.habits h
       where h.user_id = p_user and h.five_goal_id = g.goal_id
         and h.archived_at is null
    ) then
      continue;
    end if;

    insert into public.habits
      (user_id, kind, title, emoji, schedule, five_goal_id, effective_from)
    values (p_user, 'personal', g.title, g.emoji, 'daily', g.goal_id,
            current_date);
    made := made + 1;
  end loop;

  perform set_config('five.adopting', 'on', true);
  update public.habits
     set archived_at = now()
   where user_id = p_user and kind = 'personal'
     and five_goal_id is null and archived_at is null
     and lower(title) in ('healthy nutrition', 'eat well', 'eating', 'food');
  perform set_config('five.adopting', 'off', true);

  return made;
end;
$fn$;

revoke execute on function public.five_adopt_habits(uuid) from public;
grant execute on function public.five_adopt_habits(uuid) to authenticated;

-- The two that walk the five when the money is written. The set is the same, so
-- this is only about reading them in the order she does.
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
begin
  if not public.is_admin() then
    raise exception 'only he can put a settled day right' using errcode = '42501';
  end if;

  closed := not public.habit_day_open(p_day, p_user);

  settled := exists (
    select 1 from public.five_ledger
     where user_id = p_user and day = p_day and goal_id is not null
  );

  if not settled and not closed then
    return 0;
  end if;

  if public.five_day_paused(p_user, p_day) then
    delete from public.five_ledger
     where user_id = p_user and day = p_day and goal_id is not null;
    return 0;
  end if;

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

  foreach g in array array['sleep', 'study', 'eat', 'work', 'move'] loop
    live := public.five_held(p_user, p_day, g);
    select exists (
      select 1 from public.habit_entries e
        join public.habits h on h.id = e.habit_id
       where h.user_id = p_user and h.five_goal_id = g and e.day = p_day
    ) into ever;

    if not live and hard then
      continue;
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

revoke execute on function public.five_reconcile_day(uuid, date) from public;
grant execute on function public.five_reconcile_day(uuid, date) to authenticated;

create or replace function public.five_guard_hard_day()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  held integer;
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
    select 1 from public.five_days d
     where d.user_id = new.user_id and d.hard_day
       and d.day <> new.day and d.day > new.day - 7
  ) then
    raise exception 'one hard day a week' using errcode = 'P0003';
  end if;

  select count(*) into held
    from unnest(array['sleep', 'study', 'eat', 'work', 'move']) g
   where public.five_held(new.user_id, new.day, g);

  if (5 - coalesce(held, 0)) < 3 then
    raise exception 'today is going too well for that' using errcode = 'P0004';
  end if;

  return new;
end;
$fn$;
