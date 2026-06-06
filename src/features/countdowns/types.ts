import type { Tables, TablesInsert } from '@kernel/supabase';

export type Countdown = Tables<'countdowns'>;
export type CountdownInput = Pick<
  TablesInsert<'countdowns'>,
  'title' | 'target_at' | 'emoji' | 'notes'
>;
