import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { Deck } from '../types';

export function useDecks() {
  return useQuery({
    queryKey: qk.deck.list(),
    queryFn: async (): Promise<Deck[]> => {
      const { data, error } = await supabase
        .from('decks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
