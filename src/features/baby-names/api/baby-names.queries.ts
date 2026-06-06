import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { BabyNameWithVotes } from '../types';

export function useBabyNames() {
  return useQuery({
    queryKey: qk.babyNames.list(),
    queryFn: async (): Promise<BabyNameWithVotes[]> => {
      const { data, error } = await supabase
        .from('baby_names')
        .select('*, baby_name_votes(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
