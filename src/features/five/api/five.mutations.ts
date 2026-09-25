import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { usePartner, useUserId } from '@kernel/auth';
import { notifyPartner } from '@kernel/push';
import { qk } from '@kernel/query';
import { toast } from '@kernel/ui';
import { FIVE_OPEN, goalById, type GoalId } from '../lib/goals';

/**
 * Everything that writes.
 *
 * Two rules run through all of it. First, a tap is never destroyed by him: when
 * he takes one back the row stays and `revoked_at` is stamped, because "she said
 * she had" and "he found out she had not" are two different facts and the second
 * does not erase the first. Second, nothing here touches the ledger directly -
 * the money is written by the scheduler at 3AM and put right afterwards by
 * `five_reconcile_day`, so there is exactly one place the arithmetic lives.
 *
 * While FIVE_OPEN is false none of this pushes to her. That is belt and braces:
 * the scheduler already redirects, and a mutation that fired at her phone would
 * undo the whole point of keeping it hidden.
 */

/**
 * Put right a day whose money has already been written.
 *
 * His tool, and only his: the RPC refuses anyone else, because rewriting a
 * closed day's money belongs to the person paying for it. She never needs it -
 * a day she can still change has not been settled, since settling is exactly
 * what closes her window - so this is skipped rather than failed for her.
 */
async function reconcile(
  userId: string,
  day: string,
  asKeeper: boolean
): Promise<void> {
  if (!asKeeper) return;
  const { error } = await supabase.rpc('five_reconcile_day', {
    p_user: userId,
    p_day: day,
  });
  // A failure here means the pots disagree with the taps until the next
  // correction - worth a word, never worth losing the tap that caused it.
  if (error) toast.error('The pots did not follow that one. Try again.');
}

/** What the database says when it will not take a mark. */
function refusal(err: unknown): string {
  const code = (err as { code?: string } | null)?.code;
  const hint = (err as { hint?: string } | null)?.hint;
  if (code === 'P0002') return 'That day is closed. Ask your Katito.';
  if (hint === 'day_closed') return 'That day is closed. Ask your Katito.';
  if (hint === 'day_future') return 'That day has not started yet.';
  if (hint === 'not_owner') return 'Only your Katito can take a tick back.';
  if (code === 'P0001') return 'That day has not happened yet.';
  if (code === 'P0003')
    return 'One hard day a week, and this week has had its.';
  return (err as { message?: string } | null)?.message ?? 'That did not save.';
}

interface MarkVars {
  userId: string;
  day: string;
  goalId: GoalId;
  /** The habit this goal is, in the streak. One row, three screens. */
  habitId: string;
}

/**
 * She held a goal.
 *
 * Writes `habit_entries`, because that is the only place a tick lives: the same
 * row the streak's calendar draws and the home card toggles. An upsert rather
 * than an insert, so a goal he revoked can be given back without a second row
 * and a double tap on a slow connection is not an error.
 */
export function useMarkGoal() {
  const qc = useQueryClient();
  const selfId = useUserId();
  const { self } = usePartner();
  return useMutation({
    mutationFn: async ({ habitId, day }: MarkVars) => {
      const { error } = await supabase.from('habit_entries').upsert(
        {
          habit_id: habitId,
          day,
          marked_by: selfId ?? undefined,
          revoked_at: null,
          revoked_by: null,
        },
        { onConflict: 'habit_id,day' }
      );
      if (error) throw error;
    },
    onError: (err) => toast.error(refusal(err)),
    onSuccess: (_d, { userId, day }) => {
      void reconcile(userId, day, !!self?.is_admin);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.five.all() });
      // The streak draws these same rows.
      void qc.invalidateQueries({ queryKey: qk.streak.all() });
    },
  });
}

/**
 * A tick comes off.
 *
 * Hers, inside the window, is a mistap: the row goes, because a tick she never
 * meant is not history. His is a correction: the row stays, stamped, and the
 * day is reconciled so the three dollars move where they belong. The database
 * allows the stamp to him alone.
 */
export function useUnmarkGoal() {
  const qc = useQueryClient();
  const selfId = useUserId();
  return useMutation({
    mutationFn: async ({
      habitId,
      day,
      asKeeper,
    }: MarkVars & { asKeeper: boolean }) => {
      if (asKeeper) {
        const { error } = await supabase
          .from('habit_entries')
          .update({
            revoked_at: new Date().toISOString(),
            revoked_by: selfId ?? null,
          })
          .eq('habit_id', habitId)
          .eq('day', day);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from('habit_entries')
        .delete()
        .eq('habit_id', habitId)
        .eq('day', day);
      if (error) throw error;
    },
    onError: (err) => toast.error(refusal(err)),
    onSuccess: (_d, { userId, day, asKeeper }) => {
      void reconcile(userId, day, asKeeper);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.five.all() });
      void qc.invalidateQueries({ queryKey: qk.streak.all() });
    },
  });
}

/**
 * The day he tells her.
 *
 * Gives her the five as habits, idempotently, and puts away the one she already
 * kept that the Five now covers. Called from the screen on his device once
 * `FIVE_OPEN` is true, so there is no step to remember and nothing appears in
 * her streak a day early.
 */
export function useAdoptGoalHabits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc('five_adopt_habits', {
        p_user: userId,
      });
      if (error) throw error;
      return (data as number) ?? 0;
    },
    onSuccess: (made) => {
      if (made > 0) {
        void qc.invalidateQueries({ queryKey: qk.five.all() });
        void qc.invalidateQueries({ queryKey: qk.streak.all() });
      }
    },
  });
}

/**
 * Today was hard.
 *
 * The valve, and the most important button on the screen. The day stays in the
 * strip, nothing moves in either pot, and he is told - not so he can check up on
 * her, but because a day she had to call hard is the one day he should ring
 * first. One a week, counted by the database.
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
      const { error } = await supabase.from('five_days').upsert(
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
    onError: (err) => toast.error(refusal(err)),
    onSuccess: (_d, { userId, day, note }) => {
      void reconcile(userId, day, !!self?.is_admin);
      toast.info('Nothing more is asked of today 🤍');
      if (FIVE_OPEN) {
        void notifyPartner({
          kind: 'five',
          title: '🤍 A hard day',
          body: note?.trim()
            ? `She called today a hard one: "${note.trim()}"`
            : 'She called today a hard one. Nothing is owed. Maybe ring her.',
          url: '/five',
          tag: 'five-hard-day',
        });
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.five.all() });
    },
  });
}

/** Take a hard day back - it was tapped by accident, or the day turned around. */
export function useUndoHardDay() {
  const qc = useQueryClient();
  const { self } = usePartner();
  return useMutation({
    mutationFn: async ({ userId, day }: { userId: string; day: string }) => {
      const { error } = await supabase
        .from('five_days')
        .update({ hard_day: false, hard_day_at: null })
        .eq('user_id', userId)
        .eq('day', day);
      if (error) throw error;
    },
    onError: (err) => toast.error(refusal(err)),
    onSuccess: (_d, { userId, day }) =>
      void reconcile(userId, day, !!self?.is_admin),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.five.all() });
    },
  });
}

/** Her switch, and his dials. Both live in one row, written on first touch. */
export function useSaveFiveSettings() {
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
      const { error } = await supabase.from('five_settings').upsert(
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
    onError: (err) => toast.error(refusal(err)),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.five.all() });
    },
  });
}

export interface BetDraft {
  day: string;
  sport: string | null;
  pick: string;
  stakeCents: number;
  odds: number | null;
  note: string | null;
}

/** He places one. The list it joins is never pruned - that is the whole point. */
export function useAddBet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: BetDraft) => {
      const { error } = await supabase.from('five_bets').insert({
        day: draft.day,
        sport: draft.sport,
        pick: draft.pick,
        stake_cents: draft.stakeCents,
        odds: draft.odds,
        note: draft.note,
      });
      if (error) throw error;
    },
    onError: (err) => toast.error(refusal(err)),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.five.all() });
    },
  });
}

/**
 * It came in.
 *
 * A won bet pays into HER pot, not back into his pocket - the money was already
 * gone the moment a goal was missed, so the only interesting question left is
 * whose it becomes. The ledger row is unique per bet, so settling twice cannot
 * pay her twice.
 */
export function useSettleBet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bet,
      status,
      payoutCents,
      subjectId,
    }: {
      bet: { id: string; day: string; stake_cents: number };
      status: 'won' | 'lost' | 'void';
      payoutCents?: number;
      subjectId: string;
    }) => {
      const { error } = await supabase
        .from('five_bets')
        .update({
          status,
          payout_cents: status === 'won' ? (payoutCents ?? null) : null,
          settled_at: new Date().toISOString(),
        })
        .eq('id', bet.id);
      if (error) throw error;

      // Take back whatever this bet paid before paying it again. Settling is
      // not a one-way door: he corrects a win to a loss, or fixes a payout he
      // mistyped, and without this her pot keeps money from a bet that lost -
      // the unique index on `bet_id` makes it impossible to put right any other
      // way.
      const { error: undoErr } = await supabase.rpc('five_unpay_bet', {
        p_bet: bet.id,
      });
      if (undoErr) throw undoErr;

      if (status !== 'won' || !payoutCents) return;
      const { error: payErr } = await supabase.from('five_ledger').insert({
        user_id: subjectId,
        day: bet.day,
        goal_id: null,
        direction: 'gift',
        amount_cents: payoutCents,
        reason: 'bet_win',
        bet_id: bet.id,
      });
      // 23505: already paid. Anything else is worth saying out loud.
      if (payErr && payErr.code !== '23505') throw payErr;
    },
    onError: (err) => toast.error(refusal(err)),
    onSuccess: (_d, { status, payoutCents }) => {
      if (status === 'won' && payoutCents) {
        toast.success('It came in. Straight into her pot 🤍');
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.five.all() });
    },
  });
}

/** For a toast that names the thing rather than its id. */
export const goalLabel = (id: string): string => goalById(id)?.label ?? id;
