-- ════════════════════════════════════════════════════════════════════════
-- Katitos - the Five and the streak, ticked once
--
--   Two screens had grown that ask her the same question. The streak is the run
--   the two of them share - her habits, his habits, and "We talked" - and the
--   Five is the five things she asked for help with, priced in his money. Left
--   alone, the day the Five opens she would be ticking eating in two places, and
--   the two would disagree about what a tick meant.
--
--   So the five goals BECOME her habits in the streak, and a tick in either
--   place is the same tick. `habits.five_goal_id` is the seam: a habit carrying
--   one is the streak's face of that goal, and two triggers keep the tick and
--   the mark in step, each refusing to answer the other back.
--
--   ── WHAT DOES NOT MERGE ─────────────────────────────────────────────────
--   The two windows. The streak is generous on purpose - you may fix a day
--   until the day after it has ended on the clock behind, because what kills a
--   streak is a habit you did and forgot to tick. The money is not: her day
--   shuts at 3AM and stays shut, or a tracker becomes a diary.
--
--   So a tick that arrives after the money is closed still counts for the
--   streak and moves nothing. That asymmetry is deliberate and it only ever errs
--   in the direction of the streak, never of the pot. He is exempt from the
--   closing time here as everywhere: he is the one paying.
--
--   Nothing appears in her streak until he opens the Five to her. The habits are
--   created by `five_adopt_habits()`, which the app calls once, on his device,
--   on the day `FIVE_OPEN` becomes true.
-- ════════════════════════════════════════════════════════════════════════

alter table public.habits
  add column if not exists five_goal_id text;

comment on column public.habits.five_goal_id is
  'The Five goal this habit is the streak''s face of. One tick, two screens.';

-- One living habit per goal per person.
create unique index if not exists habits_five_goal_uniq
  on public.habits (user_id, five_goal_id)
  where five_goal_id is not null and archived_at is null;

-- The five are not slots she has to earn: they are the thing she asked for.
-- Widen the range so all five fit beside anything else she keeps.
alter table public.habits drop constraint if exists habits_slot_check;
alter table public.habits
  add constraint habits_slot_check check (slot between 0 and 9);

-- ── who may hold how many ──────────────────────────────────────────────────
-- The slot economy still governs habits she CHOOSES. A goal of the Five is
-- exempt from it and picks a slot above them, so the earned ones keep 1 to 4.
create or replace function public.habits_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  live    integer;
  allowed integer;
  needed  integer;
begin
  if tg_op = 'INSERT' then
    if new.kind = 'personal' then
      if auth.uid() is not null and new.five_goal_id is null then
        new.user_id := auth.uid();
      end if;

      if new.five_goal_id is not null then
        -- One of the Five. Not earned, not counted against the slots, and
        -- parked from 5 upwards so it never takes a slot she worked for.
        select coalesce(min(n), 5) into new.slot
          from generate_series(5, 9) as n
         where n not in (
           select h.slot from public.habits h
            where h.kind = 'personal' and h.user_id = new.user_id
              and h.archived_at is null
         );
        return new;
      end if;

      select count(*) into live from public.habits h
        where h.kind = 'personal' and h.user_id = new.user_id
          and h.archived_at is null and h.five_goal_id is null;

      allowed := least(4, 1 + public.streak_days() / 7);
      if auth.uid() is not null and live + 1 > allowed then
        needed := live * 7;
        raise exception 'a % habit needs a streak of % days', live + 1, needed
          using errcode = 'P0001', hint = 'slot_locked';
      end if;

      select min(n) into new.slot
        from generate_series(1, 4) as n
       where n not in (
         select h.slot from public.habits h
          where h.kind = 'personal' and h.user_id = new.user_id
            and h.archived_at is null
       );
      if new.slot is null then
        raise exception 'four habits is the most anyone gets'
          using errcode = 'P0001', hint = 'slot_locked';
      end if;
    end if;
    return new;
  end if;

  if old.kind = 'personal' and auth.uid() is not null and old.user_id <> auth.uid() then
    raise exception 'that habit is not yours'
      using errcode = 'P0001', hint = 'not_owner';
  end if;

  new.id           := old.id;
  new.kind         := old.kind;
  new.user_id      := old.user_id;
  new.slot         := old.slot;
  new.five_goal_id := old.five_goal_id;
  return new;
end;
$$;

-- ── the seam ───────────────────────────────────────────────────────────────
-- `five.mirror` is how each trigger tells the other "this write was me, leave
-- it alone". Session-local, so it cannot leak between statements.
create or replace function public.five_mirroring()
returns boolean
language sql
stable
as $$ select coalesce(current_setting('five.mirror', true), '') = 'on'; $$;

/** A mark moved: carry it to the streak. */
create or replace function public.five_mark_to_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  r        record := case when tg_op = 'DELETE' then old else new end;
  habit_id uuid;
  live     boolean;
begin
  if public.five_mirroring() then
    return r;
  end if;

  select h.id into habit_id from public.habits h
   where h.user_id = r.user_id and h.five_goal_id = r.goal_id
     and h.archived_at is null;
  if habit_id is null then
    return r; -- the Five is not hers to see yet, or this goal has no habit
  end if;

  live := tg_op <> 'DELETE' and new.revoked_at is null;

  perform set_config('five.mirror', 'on', true);
  if live then
    insert into public.habit_entries (habit_id, day, marked_by)
    values (habit_id, r.day, coalesce(r.marked_by, r.user_id))
    on conflict (habit_id, day) do nothing;
  else
    delete from public.habit_entries e
     where e.habit_id = habit_id and e.day = r.day;
  end if;
  perform set_config('five.mirror', 'off', true);

  return r;
end;
$fn$;

drop trigger if exists five_marks_to_streak on public.five_marks;
create trigger five_marks_to_streak
  after insert or update or delete on public.five_marks
  for each row execute function public.five_mark_to_entry();

/**
 * A streak tick moved: carry it to the Five, if the money is still open.
 *
 * The only place the two rules part company. A tick for a day the Five has
 * already closed is a real tick - it counts for the run - and it moves no money,
 * because the pot was settled at 3AM and reopening it from a different screen
 * would make the closing time a suggestion.
 */
create or replace function public.entry_to_five_mark()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  r      record := case when tg_op = 'DELETE' then old else new end;
  h      public.habits;
  zone   text;
  cutoff timestamptz;
begin
  if public.five_mirroring() then
    return r;
  end if;

  select * into h from public.habits where id = r.habit_id;
  if h.id is null or h.five_goal_id is null or h.user_id is null then
    return r;
  end if;

  select public.safe_tz(m.timezone) into zone
    from public.couple_members m where m.user_id = h.user_id;
  cutoff := ((r.day + 1)::timestamp + interval '3 hours')
            at time zone coalesce(zone, 'UTC');

  -- Past the closing time only he may still move money.
  if now() > cutoff and not public.is_admin() then
    return r;
  end if;

  perform set_config('five.mirror', 'on', true);
  if tg_op = 'DELETE' then
    delete from public.five_marks m
     where m.user_id = h.user_id and m.day = r.day
       and m.goal_id = h.five_goal_id;
  else
    insert into public.five_marks (user_id, day, goal_id, marked_by)
    values (h.user_id, r.day, h.five_goal_id, r.marked_by)
    on conflict (user_id, day, goal_id) do update
      set revoked_at = null, revoked_by = null, done_at = now();
  end if;
  perform set_config('five.mirror', 'off', true);

  return r;
end;
$fn$;

drop trigger if exists habit_entries_to_five on public.habit_entries;
create trigger habit_entries_to_five
  after insert or delete on public.habit_entries
  for each row execute function public.entry_to_five_mark();

-- The Five's own window guard must let a mirrored write through: the streak has
-- already decided whether that day is open on its terms, and the function above
-- has already decided whether the money may move.
create or replace function public.five_guard_window()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  row_day  date := case when tg_op = 'DELETE' then old.day else new.day end;
  row_user uuid := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  result   record := case when tg_op = 'DELETE' then old else new end;
  zone   text;
  cutoff timestamptz;
  today  date;
begin
  if auth.uid() is null or public.five_mirroring() then
    return result;
  end if;

  select public.safe_tz(m.timezone) into zone
    from public.couple_members m where m.user_id = row_user;
  zone  := coalesce(zone, 'UTC');
  today := (now() at time zone zone)::date;

  if row_day > today then
    raise exception 'that day has not happened yet' using errcode = 'P0001';
  end if;

  if public.is_admin() then
    return result;
  end if;

  if row_user <> auth.uid() then
    raise exception 'that is not yours to mark' using errcode = 'P0001';
  end if;

  cutoff := ((row_day + 1)::timestamp + interval '3 hours') at time zone zone;
  if now() > cutoff then
    raise exception 'that day is closed' using errcode = 'P0002';
  end if;

  return result;
end;
$fn$;

-- And the streak's guard must let one through in the other direction.
create or replace function public.habit_entries_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  h public.habits;
  d date;
begin
  if public.five_mirroring() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'DELETE' then
    select * into h from public.habits where id = old.habit_id;
    d := old.day;
  else
    select * into h from public.habits where id = new.habit_id;
    d := new.day;
    if auth.uid() is not null then
      new.marked_by := auth.uid();
    end if;
  end if;

  if h.id is null then
    raise exception 'no such habit' using errcode = 'P0001', hint = 'no_habit';
  end if;

  if h.kind = 'personal' and auth.uid() is not null and h.user_id <> auth.uid() then
    raise exception 'that one is not yours to tick'
      using errcode = 'P0001', hint = 'not_owner';
  end if;

  if not public.habit_day_open(d, auth.uid()) then
    if auth.uid() is not null and d > (
         select date(now() at time zone public.safe_tz(m.timezone))
         from public.couple_members m where m.user_id = auth.uid()
       ) then
      raise exception 'day % has not started for you', d
        using errcode = 'P0001', hint = 'day_future';
    end if;
    raise exception 'day % is closed', d
      using errcode = 'P0001', hint = 'day_closed';
  end if;

  if tg_op = 'INSERT' then
    if d < h.effective_from then
      raise exception 'habit % had not started on %', h.title, d
        using errcode = 'P0001', hint = 'not_started';
    end if;
    if h.archived_at is not null then
      raise exception 'habit % is put away', h.title
        using errcode = 'P0001', hint = 'archived';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- ── the day he tells her ───────────────────────────────────────────────────
-- Idempotent, admin-only, and safe to call on every launch: it creates the five
-- habits she does not have yet, and puts away a habit of hers that one of the
-- five has replaced.
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
      ('work',  'Work',  '💼'),
      ('study', 'Study', '📚'),
      ('eat',   'Eat well', '🍲'),
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

  -- "Healthy nutrition" is "Eat well" under another name. Two of them in one
  -- list is the double-tick this whole migration exists to end.
  update public.habits
     set archived_at = now()
   where user_id = p_user and kind = 'personal'
     and five_goal_id is null and archived_at is null
     and lower(title) in ('healthy nutrition', 'eat well', 'eating', 'food');

  return made;
end;
$fn$;

revoke execute on function public.five_adopt_habits(uuid) from public;
grant execute on function public.five_adopt_habits(uuid) to authenticated;
