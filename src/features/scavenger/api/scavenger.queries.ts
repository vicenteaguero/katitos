import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { ScavengerCardFull } from '../types';

export function useScavengerCards() {
  return useQuery({
    queryKey: qk.scavenger.cards(),
    queryFn: async (): Promise<ScavengerCardFull[]> => {
      const { data, error } = await supabase
        .from('scavenger_cards')
        .select('*, scavenger_claims(*), scavenger_arguments(*)')
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ScavengerCardFull[];
    },
  });
}
