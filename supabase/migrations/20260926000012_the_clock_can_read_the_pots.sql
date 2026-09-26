-- ════════════════════════════════════════════════════════════════════════
-- Katitos - the clock can read the pots
--
--   `money_pots` ends with `where public.is_member()`, and `is_member()` asks
--   about `auth.uid()`. The scheduler has no uid, so the function returned no
--   row at all, supabase-js handed back null, and the tick read every figure as
--   zero.
--
--   One thing depended on it and has therefore never once fired: the weekly
--   "$X still to place" reminder, the only thing in the whole feature that
--   chases him to actually put her missed days on a match. A bet pot nobody
--   ever places is just a number going up, which is the one failure this
--   mechanic cannot survive.
--
--   Same treatment as `habit_entries_guard` got in 20260925000019: a null uid
--   is not a person, it is the clock, and the clock may read.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.money_pots(p_user uuid)
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
      select sum(stake_cents) from public.bets where status = 'open'), 0)
  ) where public.is_member() or auth.uid() is null;
$$;

-- The one the app reads gets the same rule, so the two can never disagree about
-- who is allowed to ask.
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

    'lost_clp', coalesce((
      select sum(coalesce(stake_clp, 0)) from public.bets
       where status = 'lost'), 0),
    'won_clp', coalesce((
      select sum(coalesce(payout_clp, 0)) from public.bets
       where status = 'won'), 0),

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
   where public.is_member() or auth.uid() is null;
$$;

revoke execute on function public.money_pots(uuid) from public;
grant execute on function public.money_pots(uuid) to authenticated;
revoke execute on function public.money_pots_periods(uuid, date) from public;
grant execute on function public.money_pots_periods(uuid, date) to authenticated;
