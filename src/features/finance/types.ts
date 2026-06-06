import type { Tables, TablesInsert } from '@kernel/supabase';

export type FinanceGoal = Tables<'finance_goals'>;
export type FinanceContribution = Tables<'finance_contributions'>;

export type GoalInput = Pick<
  TablesInsert<'finance_goals'>,
  'title' | 'target_amount' | 'currency' | 'target_date' | 'notes'
>;

export type ContributionInput = {
  goalId: string;
  amount: number;
  note?: string | null;
};

/** A goal with just enough of its contributions to compute progress. */
export type GoalWithContribs = FinanceGoal & {
  finance_contributions: { amount: number }[];
};

/** Total saved so far across a goal's contributions. */
export function savedFor(goal: GoalWithContribs): number {
  return goal.finance_contributions.reduce((sum, c) => sum + c.amount, 0);
}
