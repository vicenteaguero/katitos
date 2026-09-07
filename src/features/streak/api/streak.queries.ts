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
    queryKey: qk.streak.habits(),
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

/** The ticks inside one window of days, inclusive at both ends. */
export function useEntries(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: qk.streak.entries(from, to),
    enabled: enabled && !!from && !!to,
    queryFn: async (): Promise<HabitEntry[]> => {
      const { data, error } = await supabase
        .from('habit_entries')
        .select('*')
        .gte('day', from)
        .lte('day', to);
      if (error) throw error;
      return data ?? [];
    },
  });
}
