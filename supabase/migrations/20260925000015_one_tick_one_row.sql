-- ════════════════════════════════════════════════════════════════════════
-- Katitos - one tick, one row
--
--   The Five and the streak were built as two things that agreed with each
--   other. They are not two things. They are one: the habits she keeps, the
--   habits he keeps, the call they share, and money riding on hers.
--
--   So `five_marks` is gone and `habit_entries` is the only place a tick lives.
--   A goal of the Five is a habit carrying `five_goal_id`; ticking it in the
--   streak, in the Five, or on the home card writes the same row, and the money
--   is read off that row at the close of the day. There is nothing left to keep
--   in step, because there is nothing left to disagree.
--
--   ── ONE WINDOW, AND IT IS THE GENEROUS ONE ──────────────────────────────
--   Two rules could not survive the merge either. The Five closed her day at
--   3AM; the streak lets you fix a day until the day after it has ended on the
--   clock behind, because what kills a streak is not a missed habit, it is a
--   habit you did and forgot to tick. The streak's rule is the wider of the two
--   and it was asked for in the same spirit ("some opportunity"), so it wins,
--   and `habit_day_open()` is now the only answer to "may I still tick this".
--   The money settles when the day is shut for both of them.
--
--   ── WHAT ONLY HE CAN DO ─────────────────────────────────────────────────
--   Take a tick back. `revoked_at` on the entry, not a delete, so the history
--   keeps both facts: that she said she had, and that he found out otherwise.
--   Her own untick inside the window is still a plain delete - a mistap is not
--   history.
-- ════════════════════════════════════════════════════════════════════════

-- ── a tick can be taken back ───────────────────────────────────────────────
alter table public.habit_entries
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references auth.users (id) on delete set null;

comment on column public.habit_entries.revoked_at is
  'He took this one back. The row stays: she said she had, and he found out.';

-- ── the mirror is no longer a thing that needs mirroring ───────────────────
drop trigger if exists five_marks_to_streak on public.five_marks;
drop trigger if exists habit_entries_to_five on public.habit_entries;
drop function if exists public.five_mark_to_entry();
drop function if exists public.entry_to_five_mark();
drop trigger if exists five_marks_window on public.five_marks;
drop table if exists public.five_marks;
-- `five_days` carried the same window guard, and the hard-day guard below now
-- asks the streak's question instead, so the function goes with the table.
drop trigger if exists five_days_window on public.five_days;
drop function if exists public.five_guard_window();

-- ── did she hold this goal that day? ───────────────────────────────────────
-- The one question the money asks, answered from the one table that knows.
create or replace function public.five_held(p_user uuid, p_day date, p_goal text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.habit_entries e
      join public.habits h on h.id = e.habit_id
     where h.user_id = p_user
       and h.five_goal_id = p_goal
       and e.day = p_day
       and e.revoked_at is null
  );
$$;

revoke execute on function public.five_held(uuid, date, text) from public;
grant execute on function public.five_held(uuid, date, text) to authenticated;

-- ── only he takes a tick back ──────────────────────────────────────────────
create or replace function public.habit_entries_revoke_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.revoked_at is distinct from old.revoked_at then
    raise exception 'only he takes a tick back'
      using errcode = 'P0001', hint = 'not_owner';
  end if;
  return new;
end;
$fn$;

drop trigger if exists habit_entries_revoke on public.habit_entries;
create trigger habit_entries_revoke
  before update on public.habit_entries
  for each row execute function public.habit_entries_revoke_guard();

-- A revoked tick is not a tick: the streak must not count it either.
create or replace function public.streak_days()
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  max_local date;
  d         date;
  n         integer := 0;
  guard     integer := 0;
  complete  boolean;
begin
  select max(date(now() at time zone public.safe_tz(m.timezone)))
    into max_local from public.couple_members m;
  if max_local is null then
    return 0;
  end if;

  d := max_local;
  loop
    guard := guard + 1;
    exit when guard > 3650;

    select count(*) > 0 and count(*) filter (
             where exists (
               select 1 from public.habit_entries e
               where e.habit_id = h.id and e.day = d
                 and e.revoked_at is null
             )
           ) = count(*)
      into complete
      from public.habits h
     where h.schedule = 'daily'
       and h.effective_from <= d
       and (h.archived_at is null or date(h.archived_at) > d);

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

-- ── the hard day counts from the same rows ─────────────────────────────────
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
    from unnest(array['sleep', 'work', 'study', 'eat', 'move']) g
   where public.five_held(new.user_id, new.day, g);

  if (5 - coalesce(held, 0)) < 3 then
    raise exception 'today is going too well for that' using errcode = 'P0004';
  end if;

  return new;
end;
$fn$;

drop trigger if exists five_days_window on public.five_days;
drop trigger if exists five_days_hard_day on public.five_days;
create trigger five_days_hard_day
  before insert or update or delete on public.five_days
  for each row execute function public.five_guard_hard_day();

-- ── putting a settled day right, off the one table ─────────────────────────
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

  -- Shut for both of them: the same question `habit_day_open` answers, asked of
  -- the day after, which is what makes a day final.
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

  foreach g in array array['sleep', 'work', 'study', 'eat', 'move'] loop
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
