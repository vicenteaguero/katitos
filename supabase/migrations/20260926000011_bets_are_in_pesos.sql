-- ════════════════════════════════════════════════════════════════════════
-- Katitos - he bets in pesos, and she only watches
--
--   The money rides in dollars because the stakes are a dollar held and three
--   missed, and her gift is a dollar figure. But the BETS are placed in Chile,
--   in pesos, and a screen that asks him for dollars at the bookmaker is a
--   screen he has to do arithmetic for.
--
--   So a bet carries both: `stake_clp` is what he actually put on it, and
--   `stake_cents` stays the dollar value AT THE MOMENT HE PLACED IT, which is
--   what the pot is settled against. Freezing it is the point - a rate that
--   moves must never repaint what a bet cost.
--
--   Both new columns are nullable on purpose. The previous bundle survives one
--   session after a deploy (no skipWaiting), and it inserts a bet without ever
--   having heard of pesos; a NOT NULL here would refuse it. The screen falls
--   back to converting the dollars when the peso figure is missing.
--
--   ── AND SHE CANNOT WRITE THIS ───────────────────────────────────────────
--   `admin_writes` was `for all using (is_member()) with check (is_admin())`,
--   and a DELETE is checked by USING, not WITH CHECK. So she could have deleted
--   the entire log of what her missed days paid for. She reads it - that is the
--   whole point of it - and touches nothing.
-- ════════════════════════════════════════════════════════════════════════

alter table public.bets
  add column if not exists stake_clp  integer check (stake_clp > 0),
  add column if not exists payout_clp integer check (payout_clp >= 0);

comment on column public.bets.stake_clp is
  'What he actually put on it, in pesos. `stake_cents` is that in dollars, frozen at the moment it was placed.';

-- What is already there was entered in dollars. Convert it once, at the rate
-- the app is showing today, so no row reads as a blank.
update public.bets b
   set stake_clp = greatest(1, round((b.stake_cents / 100.0) * coalesce(
         (select r.rate from public.currency_rates r
           where r.base = 'USD' and r.quote = 'CLP'), 950)))
 where b.stake_clp is null;

update public.bets b
   set payout_clp = round((b.payout_cents / 100.0) * coalesce(
         (select r.rate from public.currency_rates r
           where r.base = 'USD' and r.quote = 'CLP'), 950))
 where b.payout_cents is not null and b.payout_clp is null;

-- ── hers to read, his to write ─────────────────────────────────────────────
drop policy if exists admin_writes on public.bets;

create policy members_read on public.bets
  for select using (public.is_member());
create policy admin_inserts on public.bets
  for insert with check (public.is_admin());
create policy admin_updates on public.bets
  for update using (public.is_admin()) with check (public.is_admin());
create policy admin_deletes on public.bets
  for delete using (public.is_admin());

-- ── the pots, now also in pesos where pesos are the truth ──────────────────
-- The two pots stay in dollars: they are built from the dials, which are a
-- dollar held and three missed. What is added here is what the BETS did, which
-- happened in pesos and is what the stat row under the pots reports.
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

    -- What the bets themselves did, in the money they were placed in.
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
   where public.is_member();
$$;

revoke execute on function public.money_pots_periods(uuid, date) from public;
grant execute on function public.money_pots_periods(uuid, date) to authenticated;
