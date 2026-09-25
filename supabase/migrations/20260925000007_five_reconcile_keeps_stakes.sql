-- ════════════════════════════════════════════════════════════════════════
-- Katitos - a settled day keeps the stakes it was settled at
--
--   `five_reconcile_day` rebuilt a day from the CURRENT dials. That is right on
--   the day it is written and wrong forever after: raise the stakes in December,
--   then take back one generous tap from October, and the whole October day is
--   silently repriced at December's numbers. The pots would move by money that
--   was never at stake.
--
--   So the rebuild reads the price off the day itself - the amounts already in
--   its ledger rows - and only falls back to the dials for a day that somehow
--   has none. The screen already promises this ("days already settled keep the
--   stakes they were settled at"); now the database keeps the promise.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.five_reconcile_day(p_user uuid, p_day date)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  gift    integer;
  bet     integer;
  paused  boolean;
  hard    boolean;
  written integer := 0;
  g       text;
  live    boolean;
begin
  if not public.is_member() then
    raise exception 'not a member' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.five_ledger
     where user_id = p_user and day = p_day and goal_id is not null
  ) then
    return 0; -- never settled; the scheduler will write it from the same truth
  end if;

  -- The price of THIS day, as it was charged. A day is settled at one pair of
  -- stakes, so the largest of each direction is that pair.
  select max(amount_cents) filter (where direction = 'gift'),
         max(amount_cents) filter (where direction = 'bet')
    into gift, bet
    from public.five_ledger
   where user_id = p_user and day = p_day and goal_id is not null;

  -- A day where every goal went one way has only one of the two prices on it.
  -- The dials answer for the missing half, which is the best guess there is.
  if gift is null or bet is null then
    select coalesce(s.gift_cents, 100), coalesce(s.bet_cents, 300)
      into gift, bet
      from public.five_settings s where s.user_id = p_user;
  end if;
  gift := coalesce(gift, 100);
  bet  := coalesce(bet, 300);

  select not coalesce(s.active, true) into paused
    from public.five_settings s where s.user_id = p_user;
  paused := coalesce(paused, false);

  select coalesce(d.hard_day, false) into hard
    from public.five_days d where d.user_id = p_user and d.day = p_day;
  hard := coalesce(hard, false);

  delete from public.five_ledger
   where user_id = p_user and day = p_day and goal_id is not null;

  if hard or paused then
    return 0; -- a hard day costs nothing and earns nothing, then or now
  end if;

  foreach g in array array['sleep', 'work', 'study', 'eat', 'move'] loop
    select exists (
      select 1 from public.five_marks m
       where m.user_id = p_user and m.day = p_day and m.goal_id = g
         and m.revoked_at is null
    ) into live;

    insert into public.five_ledger
      (user_id, day, goal_id, direction, amount_cents, reason)
    values (
      p_user, p_day, g,
      case when live then 'gift' else 'bet' end,
      case when live then gift else bet end,
      case when live then 'done' else 'revoked' end
    );
    written := written + 1;
  end loop;

  return written;
end;
$fn$;
