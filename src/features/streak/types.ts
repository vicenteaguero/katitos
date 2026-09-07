import type { Tables } from '@kernel/supabase';

export type Habit = Tables<'habits'>;
export type HabitEntry = Tables<'habit_entries'>;
