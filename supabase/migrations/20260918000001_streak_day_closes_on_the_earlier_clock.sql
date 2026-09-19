-- ════════════════════════════════════════════════════════════════════════
-- Katitos - a day closes on the EARLIER clock, not the later one
--
--   20260907000001 promised that a day stays open until the day after it has
--   ended on the later of our two wall clocks, so she can still fix her
--   Saturday while it is Sunday in Curicó. The SQL used max() across our
--   dates, which is the clock AHEAD, so a day closed at midnight Novosibirsk
--   (14:00 in Curicó) and the promise was broken by ten hours.
--
--   min() is the clock behind: a day now closes for both of us at midnight
--   Curicó at the end of the day after it. streak_days() gets the same fix for
--   its "still open, not a miss yet" test; it still walks back from the clock
--   ahead, because that is where the newest day lives.
--
--   Replaces two functions in place. No data changes.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.habit_day_open(d date, u uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select d <= (
           select date(now() at time zone public.safe_tz(m.timezone))
           from public.couple_members m where m.user_id = u
         )
     and d + 1 >= (
           select min(date(now() at time zone public.safe_tz(m.timezone)))
           from public.couple_members m
         );
$$;

revoke execute on function public.habit_day_open(date, uuid) from public;
grant execute on function public.habit_day_open(date, uuid) to authenticated;

create or replace function public.streak_days()
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  max_local date;
  min_local date;
  d         date;
  n         integer := 0;
  guard     integer := 0;
  complete  boolean;
begin
  select max(date(now() at time zone public.safe_tz(m.timezone)))
    into max_local from public.couple_members m;
  select min(date(now() at time zone public.safe_tz(m.timezone)))
    into min_local from public.couple_members m;
  if max_local is null then
    return 0;
  end if;

  d := max_local;
  loop
    guard := guard + 1;
    exit when guard > 3650;

    -- Every daily habit that was in force that day, and all of them ticked.
    -- The `count(*) > 0` is not decoration: without it a day nobody had a
    -- habit on comes out vacuously perfect, and the walk runs to its limit.
    select count(*) > 0 and count(*) filter (
             where exists (
               select 1 from public.habit_entries e
               where e.habit_id = h.id and e.day = d
             )
           ) = count(*)
      into complete
      from public.habits h
     where h.schedule = 'daily'
       and h.effective_from <= d
       and (h.archived_at is null or date(h.archived_at) > d);

    if complete then
      n := n + 1;
    elsif d + 1 >= min_local then
      -- Still open. Not a miss yet, so it neither counts nor breaks.
      null;
    else
      exit;
    end if;

    d := d - 1;
  end loop;

  return n;
end;
$$;

revoke execute on function public.streak_days() from public;
grant execute on function public.streak_days() to authenticated;
