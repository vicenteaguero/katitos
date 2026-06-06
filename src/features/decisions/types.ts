import type { Tables } from '@kernel/supabase';

export type Decision = Tables<'decisions'>;

export type DecisionWithPositions = Decision & {
  decision_positions: Tables<'decision_positions'>[];
};
