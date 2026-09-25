-- ════════════════════════════════════════════════════════════════════════
-- Katitos - a hard day is for a hard day
--
--   The valve was one a week and nothing else, so it could be spent on a day
--   with four of the five already held, to save the last three dollars. That is
--   not what it is for, and spending it there means it is gone on the day it was
--   built for.
--
--   So it now also asks that the day actually be going badly: three or more of
--   the five still not held when she presses it. On a morning with everything
--   open that is true immediately, which is right - a day you already know is
--   lost at nine in the morning is exactly the day to call.
--
--   Both rules are hers only. He can give her a day whenever he decides to,
--   which is the answer to every edge this rule will ever have.
-- ════════════════════════════════════════════════════════════════════════

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

  -- One a rolling week.
  if exists (
    select 1 from public.five_days d
     where d.user_id = new.user_id
       and d.hard_day
       and d.day <> new.day
       and d.day > new.day - 7
  ) then
    raise exception 'one hard day a week' using errcode = 'P0003';
  end if;

  -- And only on a day that is actually going badly: three of the five still
  -- missing. Counted live, at the moment she presses it.
  select count(*) into held
    from public.five_marks m
   where m.user_id = new.user_id
     and m.day = new.day
     and m.revoked_at is null;

  if (5 - coalesce(held, 0)) < 3 then
    raise exception 'today is going too well for that'
      using errcode = 'P0004';
  end if;

  return new;
end;
$fn$;
