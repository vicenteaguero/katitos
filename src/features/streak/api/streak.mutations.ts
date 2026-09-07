import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { useUserId } from '@kernel/auth';
import { notifyPartner } from '@kernel/push';
import { toast } from '@kernel/ui';
import type { Habit, HabitEntry } from '../types';

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

/** Patch every cached window of ticks that covers this day. */
function patchWindows(
  qc: QueryClient,
  day: string,
  fn: (rows: HabitEntry[]) => HabitEntry[]
) {
  qc.setQueriesData<HabitEntry[]>(
    {
      predicate: (q) => {
        const [root, scope, from, to] = q.queryKey as [
          string,
          string,
          string,
          string,
        ];
        return (
          root === 'streak' && scope === 'entries' && from <= day && day <= to
        );
      },
    },
    (rows) => (rows ? fn(rows) : rows)
  );
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
 * Tick or untick one habit on one day.
 *
 * Optimistic, because the whole widget is one thumb tap and a round trip from
 * Novosibirsk is long enough to feel like the tap missed.
 */
export function useToggleEntry() {
  const qc = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: async ({ habitId, day, on }: ToggleVars) => {
      if (!userId) throw new Error('Not signed in');
      if (on) {
        const { error } = await supabase
          .from('habit_entries')
          .insert({ habit_id: habitId, day });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('habit_entries')
          .delete()
          .eq('habit_id', habitId)
          .eq('day', day);
        if (error) throw error;
      }
    },
    onMutate: async ({ habitId, day, on }) => {
      await qc.cancelQueries({ queryKey: qk.streak.all() });
      const snapshot = qc.getQueriesData<HabitEntry[]>({
        queryKey: ['streak', 'entries'],
      });
      patchWindows(qc, day, (rows) =>
        on
          ? [
              ...rows.filter((r) => !(r.habit_id === habitId && r.day === day)),
              {
                id: `optimistic:${habitId}:${day}`,
                habit_id: habitId,
                day,
                marked_by: userId ?? '',
                created_at: new Date().toISOString(),
              },
            ]
          : rows.filter((r) => !(r.habit_id === habitId && r.day === day))
      );
      return { snapshot };
    },
    onError: (err, _vars, ctx) => {
      for (const [key, rows] of ctx?.snapshot ?? []) qc.setQueryData(key, rows);
      toast.error(streakErrorMessage(err));
    },
    onSuccess: (_r, { on, shared, selfName }) => {
      if (on && shared) {
        void notifyPartner({
          kind: 'streak',
          title: '📞 Katitos',
          body: `${selfName ?? 'Your love'} marked that we talked today 🔥`,
          url: '/streak',
        });
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.streak.all() });
    },
  });
}

export interface NewHabit {
  title: string;
  emoji: string;
  schedule: 'daily' | 'weekly';
  targetPerWeek: number;
  slot: number;
  /**
   * A habit added at 23:50 must not cost tonight, so it starts tomorrow -
   * unless it is your first one, in which case waiting a day for the streak to
   * even begin would be silly.
   */
  effectiveFrom: string;
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
          user_id: userId,
          kind: 'personal',
          title: h.title.trim(),
          emoji: h.emoji,
          schedule: h.schedule,
          target_per_week: h.targetPerWeek,
          slot: h.slot,
          effective_from: h.effectiveFrom,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onError: (err) => toast.error(streakErrorMessage(err)),
    onSettled: () => void qc.invalidateQueries({ queryKey: qk.streak.all() }),
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
    onSettled: () => void qc.invalidateQueries({ queryKey: qk.streak.all() }),
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
    onSettled: () => void qc.invalidateQueries({ queryKey: qk.streak.all() }),
  });
}
