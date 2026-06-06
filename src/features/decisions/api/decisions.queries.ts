import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { DecisionWithPositions } from '../types';

export function useDecisions() {
  return useQuery({
    queryKey: qk.decisions.list(),
    queryFn: async (): Promise<DecisionWithPositions[]> => {
      const { data, error } = await supabase
        .from('decisions')
        .select('*, decision_positions(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
