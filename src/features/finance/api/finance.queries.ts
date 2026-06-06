import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { FinanceContribution, GoalWithContribs } from '../types';

export function useGoals() {
  return useQuery({
    queryKey: qk.finance.goals(),
    queryFn: async (): Promise<GoalWithContribs[]> => {
      const { data, error } = await supabase
        .from('finance_goals')
        .select('*, finance_contributions(amount)')
        .eq('archived', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useContributions(goalId: string) {
  return useQuery({
    queryKey: qk.finance.contributions(goalId),
    enabled: !!goalId,
    queryFn: async (): Promise<FinanceContribution[]> => {
      const { data, error } = await supabase
        .from('finance_contributions')
        .select('*')
        .eq('goal_id', goalId)
        .order('contributed_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
