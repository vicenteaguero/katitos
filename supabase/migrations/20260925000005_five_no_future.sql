-- ════════════════════════════════════════════════════════════════════════
-- Katitos - nobody ticks tomorrow
--
--   The window guard let him past every check, and that was one check too many.
--   He is meant to be free of the CLOSING time - he is the one who finds out on
--   a call that a tap was generous, days later - but a day nobody has lived yet
--   is not a day either of them can have an opinion about. Marking her Friday on
--   Wednesday would put money in a pot for something that has not happened.
--
--   So the future is refused first, for both of them, and only then does his
--   exemption from the 3AM close apply. The service role stays unbound: it is
--   the thing that closes days, and it never writes a mark.
-- ════════════════════════════════════════════════════════════════════════

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
  if auth.uid() is null then
    return result; -- the scheduler, closing a day
  end if;

  -- The day belongs to whoever the row is about, so the future is measured on
  -- THEIR clock, not on the clock of whoever is tapping. Eleven hours ahead,
  -- her Saturday starts while his Friday is still going.
  select public.safe_tz(m.timezone) into zone
    from public.couple_members m where m.user_id = row_user;
  zone  := coalesce(zone, 'UTC');
  today := (now() at time zone zone)::date;

  if row_day > today then
    raise exception 'that day has not happened yet' using errcode = 'P0001';
  end if;

  -- Past here it is only about the closing time, and he has no closing time.
  if public.is_admin() then
    return result;
  end if;

  if row_user <> auth.uid() then
    raise exception 'that is not yours to mark' using errcode = 'P0001';
  end if;

  -- 3AM on her wall clock, the morning after - the same instant `closesAt()`
  -- computes in src/features/five/lib/five-days.ts.
  cutoff := ((row_day + 1)::timestamp + interval '3 hours') at time zone zone;
  if now() > cutoff then
    raise exception 'that day is closed' using errcode = 'P0002';
  end if;

  return result;
end;
$fn$;
