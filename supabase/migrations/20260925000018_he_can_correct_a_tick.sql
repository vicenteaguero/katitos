-- ════════════════════════════════════════════════════════════════════════
-- Katitos - he can correct a tick, and only he
--
--   `habit_entries_guard` says a personal habit is ticked by the person whose
--   habit it is, which was the whole truth while the streak was only a streak.
--   Now money rides on her five, and the deal is that he is the one who finds
--   out on a call that a tick was generous - and takes it back, on a day that
--   may be weeks old.
--
--   So he may write on her entries. Not silently: a tick he takes back keeps its
--   row and its `revoked_at`, and the calendar and the ledger both stop counting
--   it. She still cannot revoke anything, hers or his, because being able to
--   quietly un-say something is exactly what an honour system cannot have.
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
  if public.five_mirroring() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'DELETE' then
    select * into h from public.habits where id = old.habit_id;
    d := old.day;
  else
    select * into h from public.habits where id = new.habit_id;
    d := new.day;
    if auth.uid() is not null and tg_op = 'INSERT' then
      new.marked_by := auth.uid();
    end if;
  end if;

  if h.id is null then
    raise exception 'no such habit' using errcode = 'P0001', hint = 'no_habit';
  end if;

  -- His to correct: the money is his, and a tick he has to take back is days
  -- old by the time he learns of it. Everyone else ticks their own.
  if h.kind = 'personal'
     and auth.uid() is not null
     and h.user_id <> auth.uid()
     and not public.is_admin() then
    raise exception 'that one is not yours to tick'
      using errcode = 'P0001', hint = 'not_owner';
  end if;

  -- He is not bound by the closing time either. A correction arrives when the
  -- conversation does.
  if not public.is_admin() and not public.habit_day_open(d, auth.uid()) then
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
