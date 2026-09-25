import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { usePartner } from '@kernel/auth';
import { notifyPartner } from '@kernel/push';
import { qk } from '@kernel/query';
import { toast } from '@kernel/ui';

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

/** Put a settled day right. His tool: the RPC refuses anyone else. */
async function reconcile(
  userId: string,
  day: string,
  asKeeper: boolean
): Promise<void> {
  if (!asKeeper) return;
  const { error } = await supabase.rpc('money_reconcile_day', {
    p_user: userId,
    p_day: day,
  });
  // A failure here means the pots disagree with the ticks until the next
  // correction - worth a word, never worth losing the tick that caused it.
  if (error) toast.error('The pots did not follow that one. Try again.');
}

/** What the database says when it will not take something. */
export function moneyRefusal(err: unknown): string {
  const code = (err as { code?: string } | null)?.code;
  const hint = (err as { hint?: string } | null)?.hint;
  if (code === 'P0002' || hint === 'day_closed') {
    return 'That day is closed. Ask your Katito.';
  }
  if (hint === 'day_future') return 'That day has not started yet.';
  if (code === 'P0003') {
    return "This week's hard day is used. Tell your Katito and he can give you another.";
  }
  if (code === 'P0004') {
    return 'Today has gone better than that. Save it for one that has not.';
  }
  if (hint === 'not_owner') return 'Your habits are his to set. Ask him.';
  return (err as { message?: string } | null)?.message ?? 'That did not save.';
}

/**
 * Today was hard.
 *
 * The valve, and the most important button on the page. The day stays in the
 * calendar, every dollar she did hold is kept, nothing is owed for the rest,
 * and he is told - not so he can check up on her, but because a day she had to
 * call hard is the day to ring her first. One a week, and only on a day with
 * three or more of hers still missing, both counted by the database.
 */
export function useHardDay() {
  const qc = useQueryClient();
  const { self } = usePartner();
  return useMutation({
    mutationFn: async ({
      userId,
      day,
      note,
    }: {
      userId: string;
      day: string;
      /** Optional, and the whole point: a hard day with a line in it is a
       *  message to him rather than a hole in the data. */
      note?: string | null;
    }) => {
      const { error } = await supabase.from('hard_days').upsert(
        {
          user_id: userId,
          day,
          hard_day: true,
          hard_day_at: new Date().toISOString(),
          note: note?.trim() || null,
        },
        { onConflict: 'user_id,day' }
      );
      if (error) throw error;
    },
    onError: (err) => toast.error(moneyRefusal(err)),
    onSuccess: (_d, { userId, day, note }) => {
      void reconcile(userId, day, !!self?.is_admin);
      toast.info('Nothing more is asked of today 🤍');
      void notifyPartner({
        kind: 'habits',
        title: '🤍 A hard day',
        body: note?.trim()
          ? `She called today a hard one: "${note.trim()}"`
          : 'She called today a hard one. Nothing is owed. Maybe ring her.',
        url: '/habits',
        tag: 'habits-hard-day',
      });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.habits.all() });
    },
  });
}

/** Take a hard day back: tapped by accident, or the day turned around. */
export function useUndoHardDay() {
  const qc = useQueryClient();
  const { self } = usePartner();
  return useMutation({
    mutationFn: async ({ userId, day }: { userId: string; day: string }) => {
      const { error } = await supabase
        .from('hard_days')
        .update({ hard_day: false, hard_day_at: null })
        .eq('user_id', userId)
        .eq('day', day);
      if (error) throw error;
    },
    onError: (err) => toast.error(moneyRefusal(err)),
    onSuccess: (_d, { userId, day }) =>
      void reconcile(userId, day, !!self?.is_admin),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.habits.all() });
    },
  });
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
  sport: string | null;
  pick: string;
  stakeCents: number;
  odds: number | null;
  /** When the match starts, as an instant. The clock chases the result from it. */
  kickoff: string | null;
  note: string | null;
}

/** He places one. The list it joins is never pruned - that is the whole point. */
export function useAddBet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: BetDraft) => {
      const { error } = await supabase.from('bets').insert({
        day: draft.day,
        sport: draft.sport,
        pick: draft.pick,
        stake_cents: draft.stakeCents,
        odds: draft.odds,
        kickoff: draft.kickoff,
        note: draft.note,
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
      payoutCents,
      subjectId,
      day,
    }: {
      bet: { id: string; day: string; stake_cents: number };
      status: 'won' | 'lost' | 'void';
      payoutCents?: number;
      subjectId: string;
      /** Her day, now: which month's gift this lands in. */
      day: string;
    }) => {
      const { error } = await supabase
        .from('bets')
        .update({
          status,
          payout_cents: status === 'won' ? (payoutCents ?? null) : null,
          settled_at: new Date().toISOString(),
        })
        .eq('id', bet.id);
      if (error) throw error;

      const { error: undoErr } = await supabase.rpc('money_unpay_bet', {
        p_bet: bet.id,
      });
      if (undoErr) throw undoErr;

      if (status !== 'won' || !payoutCents) return;
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
    onSuccess: (_d, { status, payoutCents }) => {
      if (status === 'won' && payoutCents) {
        toast.success('It came in. Straight into her pot 🤍');
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
