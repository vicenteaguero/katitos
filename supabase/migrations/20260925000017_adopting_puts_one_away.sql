-- ════════════════════════════════════════════════════════════════════════
-- Katitos - opening the Five may put one habit away
--
--   `five_adopt_habits` archives the habit of hers that one of the five now
--   covers ("Healthy nutrition" is "Eat well" under another name), and
--   `habits_guard` refused, because a habit is its owner's and he is not the
--   owner. Right rule, wrong moment: this one write is the whole point of the
--   adoption, and leaving both means she ticks eating twice, which is the thing
--   the merge exists to end.
--
--   So the adoption announces itself with a session flag and the guard lets that
--   one statement through. Not a general power: outside `five_adopt_habits` the
--   flag is never set, and her habits stay hers.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.five_adopting()
returns boolean
language sql
stable
as $$ select coalesce(current_setting('five.adopting', true), '') = 'on'; $$;

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

  -- UPDATE. A habit is its owner's, with one exception: opening the Five puts
  -- away the habit it has just replaced.
  if old.kind = 'personal'
     and auth.uid() is not null
     and old.user_id <> auth.uid()
     and not public.five_adopting() then
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

  -- The one habit the Five has just replaced, put away rather than deleted, so
  -- every tick she ever made against it stays in the calendar.
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
