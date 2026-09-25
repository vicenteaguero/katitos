-- ════════════════════════════════════════════════════════════════════════
-- Katitos - two holes in the Five, closed
--
--   1. The window guard read `new.day`, and on a DELETE there is no `new`. Her
--      own un-tap - the mistap she fixes ten seconds later - would have raised
--      a null-field error instead of taking the row away. The guard now reads
--      whichever row the operation actually has.
--
--   2. A won bet pays into HER pot, and the only way to write that was the
--      ledger, which had a read policy and nothing else. The insert is allowed
--      now, for him, for that one reason and no other: everything else in the
--      ledger is written by the scheduler at 3AM or rebuilt by
--      `five_reconcile_day`, and a screen that could write its own money would
--      make both of those pointless.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.five_guard_window()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  row_day date := case when tg_op = 'DELETE' then old.day else new.day end;
  row_user uuid := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  zone   text;
  cutoff timestamptz;
  today  date;
begin
  -- The service role (no uid) closes days, and he is never time-boxed.
  if auth.uid() is null or public.is_admin() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  select public.safe_tz(timezone) into zone
    from public.couple_members where user_id = auth.uid();
  zone := coalesce(zone, 'UTC');

  today  := (now() at time zone zone)::date;
  -- 3AM on her wall clock, the morning after - the same instant
  -- `closesAt()` computes in src/features/five/lib/five-days.ts.
  cutoff := ((row_day + 1)::timestamp + interval '3 hours') at time zone zone;

  if row_day > today then
    raise exception 'that day has not happened yet' using errcode = 'P0001';
  end if;
  if now() > cutoff then
    raise exception 'that day is closed' using errcode = 'P0002';
  end if;

  -- Her own row only. She cannot tick a day on anyone else's behalf.
  if row_user <> auth.uid() then
    raise exception 'that is not yours to mark' using errcode = 'P0001';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$fn$;

-- He pays her out of a bet that came in, and that is the only row a client may
-- ever put in the ledger.
drop policy if exists admin_pays on public.five_ledger;
create policy admin_pays on public.five_ledger
  for insert with check (public.is_admin() and reason = 'bet_win');
