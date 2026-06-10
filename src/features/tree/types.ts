import type { Tables, TablesInsert } from '@kernel/supabase';

export type TreeState = Tables<'tree_state'>;
export type TreeWatering = Tables<'tree_waterings'>;
export type TreeMilestone = Tables<'tree_milestones'>;

/** A milestone the route detects client-side and inserts on a crossing. */
export type MilestoneInput = Pick<
  TablesInsert<'tree_milestones'>,
  'kind' | 'slot' | 'threshold' | 'title' | 'emoji' | 'couple_day'
>;
