-- ════════════════════════════════════════════════════════════════════════
-- Katitos - her habits are his to set
--
--   She asked him for help, not for a form. So the arrangement is: she ticks,
--   he decides what there is to tick. He can give her a habit, rename one, and
--   put one away, and none of that costs him a slot - the slot economy is for
--   habits you take on yourself, and these are ones he is asking of her.
--
--   His own habits are unchanged in every way: his own to add, at 0, 7, 14 and
--   21 days of streak, four at the most.
--
--   Also here: the last of the scaffolding from when this was two features.
--   `five_adopting()` existed so the adoption could archive a habit of hers
--   past the ownership rule - he does not need a loophole for a thing he is now
--   simply allowed to do. `five_mirroring()` was the flag the two-table mirror
--   set, and that mirror was deleted days ago; the guards have been asking a
--   question nobody answers ever since.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.habits_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  live    integer;
  allowed integer;
  needed  integer;
  mine    boolean;
begin
  if tg_op = 'INSERT' then
    if new.kind = 'personal' then
      -- Signed in, a habit is yours unless you are him giving her one.
      if auth.uid() is not null and not public.is_admin() then
        new.user_id := auth.uid();
      end if;
      if new.user_id is null then
        new.user_id := auth.uid();
      end if;

      mine := auth.uid() is null or new.user_id = auth.uid();

      -- One he is asking of her: not earned, not counted, parked above the
      -- slots anyone works for.
      if not mine then
        select coalesce(min(n), 5) into new.slot
          from generate_series(5, 9) as n
         where n not in (
           select h.slot from public.habits h
            where h.kind = 'personal' and h.user_id = new.user_id
              and h.archived_at is null
         );
        if new.slot is null then
          raise exception 'that is enough habits for anyone'
            using errcode = 'P0001', hint = 'slot_locked';
        end if;
        return new;
      end if;

      select count(*) into live from public.habits h
        where h.kind = 'personal' and h.user_id = new.user_id
          and h.archived_at is null and h.slot between 1 and 4;

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

  -- UPDATE. A habit is its owner's to change, and hers are his as well.
  if old.kind = 'personal'
     and auth.uid() is not null
     and old.user_id <> auth.uid()
     and not public.is_admin() then
    raise exception 'that habit is not yours'
      using errcode = 'P0001', hint = 'not_owner';
  end if;

  new.id      := old.id;
  new.kind    := old.kind;
  new.user_id := old.user_id;
  new.slot    := old.slot;
  return new;
end;
$$;

drop trigger if exists habits_guard on public.habits;
create trigger habits_guard before insert or update on public.habits
  for each row execute function public.habits_guard();

-- ── the guard on a tick, without the dead flag ─────────────────────────────
create or replace function public.habit_entries_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  h public.habits;
  d date;
begin
  if auth.uid() is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'DELETE' then
    select * into h from public.habits where id = old.habit_id;
    d := old.day;
  else
    select * into h from public.habits where id = new.habit_id;
    d := new.day;
    if tg_op = 'INSERT' then
      new.marked_by := auth.uid();
    end if;
  end if;

  if h.id is null then
    raise exception 'no such habit' using errcode = 'P0001', hint = 'no_habit';
  end if;

  -- His to correct: the money is his, and a tick he has to take back is days
  -- old by the time he learns of it. Everyone else ticks their own.
  if h.kind = 'personal'
     and h.user_id <> auth.uid()
     and not public.is_admin() then
    raise exception 'that one is not yours to tick'
      using errcode = 'P0001', hint = 'not_owner';
  end if;

  if not public.is_admin() and not public.habit_day_open(d, auth.uid()) then
    if d > (
         select date(now() at time zone public.safe_tz(m.timezone))
         from public.couple_members m where m.user_id = auth.uid()
       ) then
      raise exception 'day % has not started for you', d
        using errcode = 'P0001', hint = 'day_future';
    end if;
    raise exception 'day % is closed', d
      using errcode = 'P0001', hint = 'day_closed';
  end if;

  -- Nobody ticks a day that has not happened, him included.
  if public.is_admin() and d > (
       select max(date(now() at time zone public.safe_tz(m.timezone)))
         from public.couple_members m
     ) then
    raise exception 'day % has not happened yet', d
      using errcode = 'P0001', hint = 'day_future';
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

drop trigger if exists habit_entries_guard on public.habit_entries;
create trigger habit_entries_guard
  before insert or update or delete on public.habit_entries
  for each row execute function public.habit_entries_guard();

-- ── the last of the two-feature scaffolding ────────────────────────────────
drop function if exists public.five_held(uuid, date, text);
drop function if exists public.five_adopt_habits(uuid);
drop function if exists public.five_reconcile_day(uuid, date);
drop function if exists public.five_unpay_bet(uuid);
drop function if exists public.five_pots(uuid);
drop function if exists public.five_day_paused(uuid, date);
drop function if exists public.five_settings_guard();
drop function if exists public.five_settings_pause_log();
drop function if exists public.five_guard_hard_day();
drop function if exists public.five_mirroring();
drop function if exists public.five_adopting();

-- And the column whose only job was to say "this habit belongs to the other
-- feature". There is no other feature.
drop index if exists public.habits_five_goal_uniq;
alter table public.habits drop column if exists five_goal_id;
