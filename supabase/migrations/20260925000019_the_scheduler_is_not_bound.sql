-- ════════════════════════════════════════════════════════════════════════
-- Katitos - the clock is not one of us
--
--   `habit_entries_guard` asks whether the day is still open for `auth.uid()`.
--   For the service role there is no uid, so the answer came back "no" and
--   anything written by the scheduler, a migration or a repair by hand was
--   refused as a closed day.
--
--   Every other guard in this schema already reads a null uid as "not a person,
--   let it through" (`five_guard_hard_day`, and `five_guard_window` before it
--   was retired). This one now does too.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.habit_entries_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  h public.habits;
  d date;
begin
  if public.five_mirroring() or auth.uid() is null then
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

  -- He is not bound by the closing time either. A correction arrives when the
  -- conversation does.
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
