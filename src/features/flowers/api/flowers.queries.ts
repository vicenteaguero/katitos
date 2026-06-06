import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { Flower } from '../types';

export function useFlowers() {
  return useQuery({
    queryKey: qk.flowers.list(),
    queryFn: async (): Promise<Flower[]> => {
      const { data, error } = await supabase
        .from('flowers')
        .select('*')
        .order('occasion_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
