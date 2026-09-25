-- ════════════════════════════════════════════════════════════════════════
-- Katitos - the pots have a week and a month
--
--   A pot that only ever grows is a total, not a pot. So each one gets a period,
--   and the period is the thing that makes it real:
--
--     the betting money  one week, Monday to Sunday. Whatever her missed habits
--                        burned that week is what he puts on a match.
--     her surprise gift  one calendar month. Whatever her held habits earned is
--                        what he spends on her at the end of it.
--
--   THE FIRST PERIOD SWALLOWS THE STUB. She starts on a Saturday, so "this
--   Sunday" would be a pot with two days in it and a present bought with $3.
--   The first week therefore runs to the Sunday AFTER the coming one, and the
--   first month to the end of the month AFTER the one it started in: from
--   2026-09-26 that is Sunday 4 October and Saturday 31 October. September does
--   not get a gift of its own.
--
--   The rule lives here and only here. The screen prints the dates this function
--   hands it rather than working them out again, because two copies of a calendar
--   rule is two calendars.
-- ════════════════════════════════════════════════════════════════════════

-- ── the two windows ────────────────────────────────────────────────────────
-- Given a day, which week is it in and which month. Separate from the sums so
-- the periods can be asked about on their own, which is what a probe does.
create or replace function public.money_windows(p_user uuid, p_day date)
returns table (
  bet_from  date,
  bet_to    date,
  gift_from date,
  gift_to   date
)
language sql
stable
security definer
set search_path = public
as $$
  with s as (
    select coalesce(
             (select started_on from public.money_settings where user_id = p_user),
             p_day
           ) as started
  ),
  ends as (
    select
      started,
      -- The Monday of the week it started in, plus a fortnight less a day: the
      -- second Sunday, not the first.
      (date_trunc('week', started)::date + 13) as first_bet_to,
      -- The last day of the month after the one it started in.
      (date_trunc('month', started) + interval '2 month' - interval '1 day')::date
        as first_gift_to
    from s
  )
  select
    case when p_day <= first_bet_to then started
         else date_trunc('week', p_day)::date end,
    case when p_day <= first_bet_to then first_bet_to
         else date_trunc('week', p_day)::date + 6 end,
    case when p_day <= first_gift_to then started
         else date_trunc('month', p_day)::date end,
    case when p_day <= first_gift_to then first_gift_to
         else (date_trunc('month', p_day) + interval '1 month' - interval '1 day')::date end
  from ends;
$$;

revoke execute on function public.money_windows(uuid, date) from public;
grant execute on function public.money_windows(uuid, date) to authenticated;

-- ── the pots, with their periods ───────────────────────────────────────────
-- `money_pots` stays exactly as it is: the previous bundle is still running on
-- one of the two phones until it is opened twice, and it calls that one.
--
-- The period figures are what the screen leads with. The lifetime ones are still
-- here because the honest line under them - what he owes and has not placed -
-- is a debt, and a debt does not reset on Sunday.
create or replace function public.money_pots_periods(
  p_user uuid,
  p_day  date default current_date
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'gift_cents', coalesce((
      select sum(amount_cents) from public.money_ledger
       where user_id = p_user and direction = 'gift'), 0),
    'bet_cents', coalesce((
      select sum(amount_cents) from public.money_ledger
       where user_id = p_user and direction = 'bet'), 0),
    'staked_cents', coalesce((
      select sum(stake_cents) from public.bets where status <> 'void'), 0),
    'lost_cents', coalesce((
      select sum(stake_cents) from public.bets where status = 'lost'), 0),
    'won_cents', coalesce((
      select sum(coalesce(payout_cents, 0)) from public.bets
       where status = 'won'), 0),
    'open_cents', coalesce((
      select sum(stake_cents) from public.bets where status = 'open'), 0),

    'gift_from', w.gift_from,
    'gift_to', w.gift_to,
    'gift_period_cents', coalesce((
      select sum(amount_cents) from public.money_ledger
       where user_id = p_user and direction = 'gift'
         and day between w.gift_from and w.gift_to), 0),

    'bet_from', w.bet_from,
    'bet_to', w.bet_to,
    'bet_period_cents', coalesce((
      select sum(amount_cents) from public.money_ledger
       where user_id = p_user and direction = 'bet'
         and day between w.bet_from and w.bet_to), 0),
    'bet_period_staked_cents', coalesce((
      select sum(stake_cents) from public.bets
       where status <> 'void' and day between w.bet_from and w.bet_to), 0)
  )
    from public.money_windows(p_user, p_day) w
   where public.is_member();
$$;

revoke execute on function public.money_pots_periods(uuid, date) from public;
grant execute on function public.money_pots_periods(uuid, date) to authenticated;

comment on function public.money_pots_periods(uuid, date) is
  'Both pots: this week for the betting money, this month for her gift, plus the lifetime figures the honest line needs.';
