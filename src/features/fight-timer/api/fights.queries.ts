import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { Fight } from '../types';

/** The current ongoing fight (ended_at is null), or null if all is well. */
export function useActiveFight() {
  return useQuery({
    queryKey: qk.fights.active(),
    queryFn: async (): Promise<Fight | null> => {
      const { data, error } = await supabase
        .from('fights')
        .select('*')
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

/** Past, resolved fights — newest resolution first. */
export function useFightHistory() {
  return useQuery({
    queryKey: qk.fights.list(),
    queryFn: async (): Promise<Fight[]> => {
      const { data, error } = await supabase
        .from('fights')
        .select('*')
        .not('ended_at', 'is', null)
        .order('ended_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
