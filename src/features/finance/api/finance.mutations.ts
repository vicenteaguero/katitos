import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { ContributionInput, GoalInput } from '../types';

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: GoalInput) => {
      const { error } = await supabase.from('finance_goals').insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.finance.goals() }),
  });
}

export function useAddContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ goalId, amount, note }: ContributionInput) => {
      // user_id defaults to auth.uid() on the server.
      const { error } = await supabase.from('finance_contributions').insert({
        goal_id: goalId,
        amount,
        note: note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { goalId }) => {
      void qc.invalidateQueries({ queryKey: qk.finance.goals() });
      void qc.invalidateQueries({
        queryKey: qk.finance.contributions(goalId),
      });
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('finance_goals')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.finance.goals() }),
  });
}
