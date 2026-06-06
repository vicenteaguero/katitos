import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { Lang, Phrase } from '../types';

export function usePhrases(language: Lang) {
  return useQuery({
    queryKey: qk.phrases.list(language),
    queryFn: async (): Promise<Phrase[]> => {
      const { data, error } = await supabase
        .from('phrases')
        .select('*')
        .eq('language', language)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
