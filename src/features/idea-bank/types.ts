import type { Tables, TablesInsert } from '@kernel/supabase';

export type Idea = Tables<'ideas'>;
export type IdeaInput = Pick<
  TablesInsert<'ideas'>,
  'title' | 'description' | 'category' | 'status'
>;
