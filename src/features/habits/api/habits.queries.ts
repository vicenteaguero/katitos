import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { Habit, HabitEntry } from '../types';

/**
 * Every habit, archived ones included.
 *
 * The archived rows are not clutter: a day we already lived was judged against
 * the habits that existed then, and dropping them here would quietly repaint
 * the calendar every time one of us puts a habit away.
 */
export function useHabits() {
  return useQuery({
    queryKey: qk.habits.list(),
    queryFn: async (): Promise<Habit[]> => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .order('kind', { ascending: false })
        .order('slot', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * The ticks inside one window of days, inclusive at both ends.
 *
 * A revoked tick is not a tick. The row stays, because the history is that she
 * said she had and he found out otherwise, but the money reads it as missed and
 * so must the calendar - it was counting a lit square against a billed day.
 */
export function useEntries(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: qk.habits.entries(from, to),
    enabled: enabled && !!from && !!to,
    queryFn: async (): Promise<HabitEntry[]> => {
      const { data, error } = await supabase
        .from('habit_entries')
        .select('*')
        .is('revoked_at', null)
        .gte('day', from)
        .lte('day', to);
      if (error) throw error;
      return data ?? [];
    },
  });
}
