import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { Punito } from '../types';

export function usePunitos() {
  return useQuery({
    queryKey: qk.punitos.list(),
    queryFn: async (): Promise<Punito[]> => {
      const { data, error } = await supabase
        .from('punitos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
