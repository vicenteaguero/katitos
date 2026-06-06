import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { Polaroid } from '../types';
import { todayKey } from '../types';

export function usePolaroids() {
  return useQuery({
    queryKey: qk.polaroids.list(),
    queryFn: async (): Promise<Polaroid[]> => {
      const { data, error } = await supabase
        .from('polaroids')
        .select('*')
        .order('day', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTodayPolaroid() {
  const day = todayKey();
  return useQuery({
    queryKey: qk.polaroids.byDay(day),
    queryFn: async (): Promise<Polaroid | null> => {
      const { data, error } = await supabase
        .from('polaroids')
        .select('*')
        .eq('day', day)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
