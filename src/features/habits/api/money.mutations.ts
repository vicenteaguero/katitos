import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { toast } from '@kernel/ui';
import { toCents } from '../lib/money';

/**
 * Everything that moves money.
 *
 * Note what is NOT here: ticking. A habit is ticked by `useToggleEntry` in
 * `habits.mutations.ts`, the same call the calendar and the home card make,
 * and the money is read off those ticks at the close of the day. There is one
 * way to say "I did this" and it is not in this file.
 *
 * Nothing here writes the ledger either. The clock settles a day at its close
 * and `money_reconcile_day` puts it right afterwards, so the arithmetic lives
 * in exactly one place - the only exception being a bet that came in, which
 * pays her through a policy narrow enough to name.
 */

/** What the database says when it will not take something. */
export function moneyRefusal(err: unknown): string {
  const code = (err as { code?: string } | null)?.code;
  const hint = (err as { hint?: string } | null)?.hint;
  if (code === 'P0002' || hint === 'day_closed') {
    return 'That day is closed. Ask your Katito.';
  }
  if (hint === 'day_future') return 'That day has not started yet.';
  if (hint === 'not_owner') return 'Your habits are his to set. Ask him.';
  return (err as { message?: string } | null)?.message ?? 'That did not save.';
}

/** Her switch, and his dials. Both live in one row, written on first touch. */
export function useSaveMoneySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      active,
      giftCents,
      betCents,
    }: {
      userId: string;
      active?: boolean;
      giftCents?: number;
      betCents?: number;
    }) => {
      const { error } = await supabase.from('money_settings').upsert(
        {
          user_id: userId,
          ...(active === undefined ? {} : { active }),
          ...(giftCents === undefined ? {} : { gift_cents: giftCents }),
          ...(betCents === undefined ? {} : { bet_cents: betCents }),
        },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
    },
    onError: (err) => toast.error(moneyRefusal(err)),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.habits.all() });
    },
  });
}

export interface BetDraft {
  day: string;
  pick: string;
  /** What he actually puts on it, in pesos. */
  stakeClp: number;
  odds: number;
  /** When the match starts, as an instant. The clock chases the result from it. */
  kickoff: string | null;
  /** A dollar in pesos, right now. Frozen into the row, never applied twice. */
  rate: number;
}

/**
 * He places one.
 *
 * The peso figure is what he handed over; the dollar figure is what that was
 * worth AT THAT MOMENT, and it is the one the pot is settled against. Freezing
 * it is the point: a rate that moves next week must not repaint what a bet cost.
 *
 * The sport is always football, so it is not a question anybody is asked.
 */
export function useAddBet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: BetDraft) => {
      const { error } = await supabase.from('bets').insert({
        day: draft.day,
        sport: 'Football',
        pick: draft.pick,
        stake_clp: draft.stakeClp,
        stake_cents: toCents(draft.stakeClp, draft.rate),
        odds: draft.odds,
        kickoff: draft.kickoff,
      });
      if (error) throw error;
    },
    onError: (err) => toast.error(moneyRefusal(err)),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.habits.all() });
    },
  });
}

/**
 * It was a mistake, so it goes.
 *
 * There used to be a 'void' status for this, which left a row in the log saying
 * nothing forever. A bet that was never placed is not history. The ledger row a
 * won bet wrote goes with it, on cascade, so her gift cannot keep money from a
 * bet that never existed.
 */
export function useDeleteBet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bets').delete().eq('id', id);
      if (error) throw error;
    },
    onError: (err) => toast.error(moneyRefusal(err)),
    onSuccess: () => toast.info('Gone, as if it had never been placed'),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.habits.all() });
    },
  });
}

/**
 * It came in, or it did not.
 *
 * A won bet pays into HER pot, not back into his pocket: the money was gone the
 * moment a habit was missed, so the only question left is whose it becomes. The
 * previous payout is taken back first, because settling is not a one-way door -
 * he corrects a win to a loss, or fixes a figure he mistyped, and without that
 * her pot would keep money from a bet that lost.
 *
 * It pays into the gift that is OPEN, dated the day he settles it and not the day
 * the match was played. Her gift is a month now: a bet from September that comes
 * in halfway through October, credited to September, would be money she can see
 * and never be given.
 */
export function useSettleBet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bet,
      status,
      payoutClp,
      subjectId,
      day,
      rate,
    }: {
      bet: { id: string; day: string; stake_cents: number };
      status: 'won' | 'lost';
      /** What it paid, in pesos. */
      payoutClp?: number;
      subjectId: string;
      /** Her day, now: which month's gift this lands in. */
      day: string;
      /** A dollar in pesos, for the figure her gift is credited in. */
      rate: number;
    }) => {
      const won = status === 'won' && !!payoutClp;
      const payoutCents = won ? toCents(payoutClp!, rate) : null;
      const { error } = await supabase
        .from('bets')
        .update({
          status,
          payout_clp: won ? payoutClp : null,
          payout_cents: payoutCents,
          settled_at: new Date().toISOString(),
        })
        .eq('id', bet.id);
      if (error) throw error;

      const { error: undoErr } = await supabase.rpc('money_unpay_bet', {
        p_bet: bet.id,
      });
      if (undoErr) throw undoErr;

      if (!won || !payoutCents) return;
      const { error: payErr } = await supabase.from('money_ledger').insert({
        user_id: subjectId,
        day,
        habit_id: null,
        direction: 'gift',
        amount_cents: payoutCents,
        reason: 'bet_win',
        bet_id: bet.id,
      });
      if (payErr) throw payErr;
    },
    onError: (err) => toast.error(moneyRefusal(err)),
    onSuccess: (_d, { status, payoutClp }) => {
      if (status === 'won' && payoutClp) {
        toast.success('It came in. Straight into her gift 🤍');
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.habits.all() });
    },
  });
}

/** Her habits, the first five, when he is setting her up. */
export function useSeedHerHabits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc('seed_her_habits', {
        p_user: userId,
      });
      if (error) throw error;
      return (data as number) ?? 0;
    },
    onError: (err) => toast.error(moneyRefusal(err)),
    onSuccess: (made) => {
      toast.success(
        made > 0 ? `${made} habits are hers now` : 'She has them already'
      );
      void qc.invalidateQueries({ queryKey: qk.habits.all() });
    },
  });
}
