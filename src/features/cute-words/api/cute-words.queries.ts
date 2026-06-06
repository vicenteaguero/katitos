import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { CuteWord } from '../types';

export function useCuteWords() {
  return useQuery({
    queryKey: qk.cuteWords.list(),
    queryFn: async (): Promise<CuteWord[]> => {
      const { data, error } = await supabase
        .from('cute_words')
        .select('*')
        .order('term', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
