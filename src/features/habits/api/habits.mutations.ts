import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { useUserId } from '@kernel/auth';
import { notifyPartner } from '@kernel/push';
import { toast } from '@kernel/ui';
import { commit, useIntents } from '../lib/intents';
import { tickKey } from '../lib/streak';
import type { Habit } from '../types';

/**
 * Ticking has to feel like flipping a switch, not like submitting a form. So
 * every mutation here paints the change first and asks the database second, and
 * the only thing the user ever sees on failure is one sentence in their own
 * language plus the tick going back where it was.
 */

/** The guard triggers speak in hints; this is the only place they become words. */
export function streakErrorMessage(err: unknown): string {
  const hint = (err as { hint?: string } | null)?.hint;
  switch (hint) {
    case 'day_closed':
      return 'That day has closed for both of us 🌙';
    case 'day_future':
      return 'That day has not started for you yet';
    case 'not_owner':
      return 'That one is not yours to tick';
    case 'revoked':
      // He took this tick back, and only he can put it back. Saying so is the
      // point: an honour system where a no can be quietly undone is not one.
      return 'He took that one back. Talk to him 🤍';
    case 'not_started':
      return 'That habit had not started yet on that day';
    case 'archived':
      return 'That habit is put away';
    case 'slot_locked':
      return 'Keep the streak going a little longer to earn that one';
    case 'slot_out_of_order':
      return 'Fill the empty slot first';
    default:
      return (
        (err as { message?: string } | null)?.message || 'That did not save'
      );
  }
}

export interface ToggleVars {
  habitId: string;
  day: string;
  /** True to tick it, false to take the tick back. */
  on: boolean;
  /** Only used for the nudge when the shared one goes on. */
  shared?: boolean;
  selfName?: string;
}

/**
 * Say what one square should be, on one day.
 *
 * Not "toggle": the tap flips the wish inside the store and this asks the
 * database for the RESULT. That is the difference between a tap that can arrive
 * out of order and a state that cannot, and it is why tapping three hundred
 * times as fast as a thumb can go ends with the screen and the row agreeing. See
 * `lib/intents.ts` - the rules live there, with the reasons.
 *
 * Optimistic either way, because a round trip from Novosibirsk is long enough to
 * feel like the tap missed.
 */
export function useToggleEntry() {
  const qc = useQueryClient();
  const userId = useUserId();
  const flip = useIntents((s) => s.flip);

  return useMutation({
    mutationFn: async ({ habitId, day }: ToggleVars) => {
      if (!userId) throw new Error('Not signed in');
      return commit(
        tickKey(habitId, day),
        (on) => writeTick(habitId, day, on),
        (err) => toast.error(streakErrorMessage(err))
      );
    },
    onMutate: ({ habitId, day, on }) => ({
      next: flip(tickKey(habitId, day), on),
    }),
    onError: (err, { habitId, day }) => {
      // `commit` handles a refusal from the database itself, so this is the
      // local ones only - not signed in, and nothing else today.
      useIntents.getState().forget(tickKey(habitId, day));
      toast.error(streakErrorMessage(err));
    },
    onSuccess: (wrote, { shared, selfName }) => {
      // `wrote` is what actually reached the database, and it is null for a tap
      // that joined a write already on its way. So a bounced thumb sends her one
      // notification about the call, or none, and never four.
      if (wrote !== true || !shared) return;
      void notifyPartner({
        kind: 'habits',
        title: '📞 Katitos',
        body: `${selfName ?? 'Your love'} marked that we talked today 🔥`,
        url: '/habits',
      });
    },
    onSettled: () => {
      // Only the ticks. Refetching the habits on every tap was work nobody
      // asked for, and one more response for a tap to race.
      void qc.invalidateQueries({ queryKey: qk.habits.allEntries() });
    },
  });
}

/**
 * The one write, and it is idempotent in both directions.
 *
 * On is an UPSERT rather than an insert, and it clears `revoked_at`, which fixes
 * a quiet lie: a tick he had taken back was still a row, so the insert came back
 * "already there", the circle lit, and the money went on counting the day as
 * missed. Now it either genuinely un-takes it (his to do) or the trigger refuses
 * her out loud.
 *
 * Off is a delete of a row that may not be there, which is a no-op. Neither call
 * can half-succeed, so "the database has been told" and "the database agrees" are
 * the same sentence - which is what lets the writer in `commit` trust one reply.
 */
async function writeTick(
  habitId: string,
  day: string,
  on: boolean
): Promise<void> {
  if (on) {
    const { error } = await supabase
      .from('habit_entries')
      .upsert(
        { habit_id: habitId, day, revoked_at: null, revoked_by: null },
        { onConflict: 'habit_id,day' }
      );
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('habit_entries')
    .delete()
    .eq('habit_id', habitId)
    .eq('day', day);
  if (error) throw error;
}

export interface NewHabit {
  title: string;
  emoji: string;
  schedule: 'daily' | 'weekly';
  targetPerWeek: number;
  /**
   * A habit added at 23:50 must not cost tonight, so it starts tomorrow -
   * unless it is your first one, in which case waiting a day for the streak to
   * even begin would be silly.
   */
  effectiveFrom: string;
  /** Hers, when he is setting her habits. Defaults to your own. */
  forUserId?: string;
}

export function useCreateHabit() {
  const qc = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: async (h: NewHabit): Promise<Habit> => {
      if (!userId) throw new Error('Not signed in');
      const { data, error } = await supabase
        .from('habits')
        .insert({
          // Whose habit it is. Hers when he is the one asking it of her; the
          // database refuses anyone but him for that.
          user_id: h.forUserId ?? userId,
          kind: 'personal',
          title: h.title.trim(),
          emoji: h.emoji,
          schedule: h.schedule,
          target_per_week: h.targetPerWeek,
          effective_from: h.effectiveFrom,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onError: (err) => toast.error(streakErrorMessage(err)),
    onSettled: () => void qc.invalidateQueries({ queryKey: qk.habits.all() }),
  });
}

export function useUpdateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      title,
      emoji,
      schedule,
      targetPerWeek,
    }: {
      id: string;
      title: string;
      emoji: string;
      schedule: 'daily' | 'weekly';
      targetPerWeek: number;
    }) => {
      const { error } = await supabase
        .from('habits')
        .update({
          title: title.trim(),
          emoji,
          schedule,
          target_per_week: targetPerWeek,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onError: (err) => toast.error(streakErrorMessage(err)),
    onSettled: () => void qc.invalidateQueries({ queryKey: qk.habits.all() }),
  });
}

/**
 * Put a habit away.
 *
 * Never a delete: the days it was part of are already judged, and erasing the
 * row would repaint history. The slot it leaves behind is empty, and only the
 * streak can earn it back - which is what stops "just remove the one I keep
 * failing" from being free.
 */
export function useArchiveHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('habits')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onError: (err) => toast.error(streakErrorMessage(err)),
    onSettled: () => void qc.invalidateQueries({ queryKey: qk.habits.all() }),
  });
}
