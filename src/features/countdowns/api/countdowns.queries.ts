import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { Countdown } from '../types';

export function useCountdowns() {
  return useQuery({
    queryKey: qk.countdowns.list(),
    queryFn: async (): Promise<Countdown[]> => {
      const { data, error } = await supabase
        .from('countdowns')
        .select('*')
        .order('target_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
