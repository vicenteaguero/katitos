-- ════════════════════════════════════════════════════════════════════════
-- Katitos - the two pots, in one question
--
--   The Five screen opens on two numbers, and they are sums over every row the
--   ledger has ever held. Asking for the rows and adding them up on a phone
--   works fine for a year and then does not, so the database answers instead -
--   one round trip, five integers, and no list to grow.
--
--   The shape is deliberate. `gift` is hers, and it includes the bets that came
--   back. `bet` is everything her missed goals condemned, which is NOT the same
--   as what has actually been burned: he places the bets in his own time, so
--   `staked` trails `bet`, and `lost` trails `staked`. Showing one number for
--   all three would be the one dishonest thing on the screen.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.five_pots(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    -- Hers: every goal she held, plus every bet that paid.
    'gift_cents', coalesce((
      select sum(amount_cents) from public.five_ledger
       where user_id = p_user and direction = 'gift'), 0),
    -- Condemned by a missed goal, whether or not he has placed it yet.
    'bet_cents', coalesce((
      select sum(amount_cents) from public.five_ledger
       where user_id = p_user and direction = 'bet'), 0),
    -- Actually handed to a bookmaker.
    'staked_cents', coalesce((
      select sum(stake_cents) from public.five_bets
       where status <> 'void'), 0),
    'lost_cents', coalesce((
      select sum(stake_cents) from public.five_bets
       where status = 'lost'), 0),
    'won_cents', coalesce((
      select sum(coalesce(payout_cents, 0)) from public.five_bets
       where status = 'won'), 0),
    'open_cents', coalesce((
      select sum(stake_cents) from public.five_bets
       where status = 'open'), 0)
  ) where public.is_member();
$$;

revoke execute on function public.five_pots(uuid) from public;
grant execute on function public.five_pots(uuid) to authenticated;
