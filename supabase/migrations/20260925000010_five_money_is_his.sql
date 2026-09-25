-- ════════════════════════════════════════════════════════════════════════
-- Katitos - the stakes are his, and so is the arithmetic
--
--   Three holes, all of them the same shape: the money was guarded by the app
--   and not by the database.
--
--   1. `five_settings` was open to any member, with no test on whose row it was.
--      Signed in as her you could write HIS row, set your own gift to five
--      hundred dollars a goal and the burn to zero, and the whole mechanic
--      becomes whatever you typed. She would never do it; that is not the point.
--      A rule that only holds because nobody tries it is decoration, and this one
--      guards the one thing the feature is made of.
--
--      She keeps the switch. `active` is hers and must stay frictionless - it is
--      the only way out - but the two stake columns are his.
--
--   2. `five_reconcile_day` rewrites a settled day's money and was granted to
--      anyone signed in. It is his correction tool: he is the one who may change
--      a mark on a closed day, so he is the only one who may make the pots
--      follow. Her own taps never need it - a day she can still change has not
--      been settled yet, because settling is exactly what closes her window.
--
--   3. A won bet wrote a gift row that nothing could ever take back. Correct the
--      bet to 'lost' afterwards, or fix a mistyped payout, and her pot kept money
--      from a bet that lost, permanently, with the app unable to even report it.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. the dials ───────────────────────────────────────────────────────────
create or replace function public.five_settings_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  -- The scheduler (no uid) writes `started_on` and auto-pauses; he sets what he
  -- is willing to lose. Neither is bound by this.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.user_id <> auth.uid() then
    raise exception 'those are not your stakes' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    -- She may bring her own row into being - pausing before anything else has
    -- written it must work - but not priced by her.
    new.gift_cents := 100;
    new.bet_cents  := 300;
    return new;
  end if;

  -- Everything except the switch is his. Silently held rather than refused:
  -- she is not doing anything wrong by saving the panel she is allowed to use.
  new.gift_cents := old.gift_cents;
  new.bet_cents  := old.bet_cents;
  new.started_on := old.started_on;
  return new;
end;
$fn$;

drop trigger if exists five_settings_guard on public.five_settings;
create trigger five_settings_guard
  before insert or update on public.five_settings
  for each row execute function public.five_settings_guard();

-- ── 2. putting a settled day right is his tool ─────────────────────────────
create or replace function public.five_reconcile_day(p_user uuid, p_day date)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  gift    integer;
  bet     integer;
  hard    boolean;
  written integer := 0;
  g       text;
  live    boolean;
begin
  -- Not `is_member()`: this rewrites money on a day that is already closed, and
  -- only the person paying for it may do that.
  if not public.is_admin() then
    raise exception 'only he can put a settled day right' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.five_ledger
     where user_id = p_user and day = p_day and goal_id is not null
  ) then
    return 0; -- never settled; the scheduler will write it from the same truth
  end if;

  if public.five_day_paused(p_user, p_day) then
    delete from public.five_ledger
     where user_id = p_user and day = p_day and goal_id is not null;
    return 0;
  end if;

  select max(amount_cents) filter (where direction = 'gift'),
         max(amount_cents) filter (where direction = 'bet')
    into gift, bet
    from public.five_ledger
   where user_id = p_user and day = p_day and goal_id is not null;

  if gift is null or bet is null then
    select coalesce(s.gift_cents, 100), coalesce(s.bet_cents, 300)
      into gift, bet
      from public.five_settings s where s.user_id = p_user;
  end if;
  gift := coalesce(gift, 100);
  bet  := coalesce(bet, 300);

  select coalesce(d.hard_day, false) into hard
    from public.five_days d where d.user_id = p_user and d.day = p_day;
  hard := coalesce(hard, false);

  delete from public.five_ledger
   where user_id = p_user and day = p_day and goal_id is not null;

  foreach g in array array['sleep', 'work', 'study', 'eat', 'move'] loop
    select exists (
      select 1 from public.five_marks m
       where m.user_id = p_user and m.day = p_day and m.goal_id = g
         and m.revoked_at is null
    ) into live;

    if not live and hard then
      continue; -- a hard day forgives the misses and keeps what she held
    end if;

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

revoke execute on function public.five_reconcile_day(uuid, date) from public;
grant execute on function public.five_reconcile_day(uuid, date) to authenticated;

-- ── 3. a payout can be taken back ──────────────────────────────────────────
-- Called on every settle, before the new payout is written. A bet that is not
-- won has no business paying her, and a mistyped payout has to be correctable -
-- the unique index on `bet_id` is what makes this the only way to do it.
create or replace function public.five_unpay_bet(p_bet uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  removed integer;
begin
  if not public.is_admin() then
    raise exception 'only he settles a bet' using errcode = '42501';
  end if;

  delete from public.five_ledger
   where bet_id = p_bet and reason = 'bet_win';
  get diagnostics removed = row_count;
  return removed;
end;
$fn$;

revoke execute on function public.five_unpay_bet(uuid) from public;
grant execute on function public.five_unpay_bet(uuid) to authenticated;
