import type { Tables, TablesInsert } from '@kernel/supabase';

export type Punito = Tables<'punitos'>;
export type PunitoInput = Pick<
  TablesInsert<'punitos'>,
  'title' | 'description' | 'level'
>;
