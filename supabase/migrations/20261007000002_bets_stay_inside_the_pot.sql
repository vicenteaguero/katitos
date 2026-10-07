-- ════════════════════════════════════════════════════════════════════════
-- Katitos - a bet can only spend money the pot actually holds
--
--   The betting pot is every dollar her missed habits ever put in it. What has
--   not been bet yet stays there, owed, until bets add up to it. This makes the
--   other half a rule: all bets together (void ones aside) can never stake more
--   than the pot has ever held. A bet deleted because it went wrong hands its
--   stake back, so the books always close.
--
--   The service role (no auth.uid()) is not checked, for hand fixes.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.bets_within_pot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pot    integer;
  staked integer;
begin
  if auth.uid() is null or new.status = 'void' then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and new.stake_cents is not distinct from old.stake_cents
     and old.status <> 'void' then
    return new;
  end if;

  select coalesce(sum(amount_cents), 0) into pot
    from public.money_ledger where direction = 'bet';
  select coalesce(sum(stake_cents), 0) into staked
    from public.bets where status <> 'void' and id <> new.id;

  if staked + new.stake_cents > pot then
    raise exception 'that is more than the pot holds'
      using errcode = 'P0001', hint = 'over_pot';
  end if;
  return new;
end;
$$;

drop trigger if exists bets_within_pot on public.bets;
create trigger bets_within_pot before insert or update on public.bets
  for each row execute function public.bets_within_pot();
