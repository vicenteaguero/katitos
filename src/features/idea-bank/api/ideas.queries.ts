import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { Idea } from '../types';

export function useIdeas() {
  return useQuery({
    queryKey: qk.ideas.list(),
    queryFn: async (): Promise<Idea[]> => {
      const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
