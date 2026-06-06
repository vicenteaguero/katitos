import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { ChalkNote } from '../types';

export function useChalkNotes() {
  return useQuery({
    queryKey: qk.chalkboard.notes(),
    queryFn: async (): Promise<ChalkNote[]> => {
      const { data, error } = await supabase
        .from('chalkboard_notes')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
