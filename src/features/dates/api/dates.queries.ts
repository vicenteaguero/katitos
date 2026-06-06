import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { DatePhoto, DateWithRatings } from '../types';

/** All dates with their ratings, newest first. */
export function useDates() {
  return useQuery({
    queryKey: qk.dates.list(),
    queryFn: async (): Promise<DateWithRatings[]> => {
      const { data, error } = await supabase
        .from('dates')
        .select('*, date_ratings(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** One date with its ratings. */
export function useDate(id: string | undefined) {
  return useQuery({
    queryKey: qk.dates.one(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<DateWithRatings> => {
      const { data, error } = await supabase
        .from('dates')
        .select('*, date_ratings(*)')
        .eq('id', id as string)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

/** Photos attached to a date, oldest first. */
export function useDatePhotos(dateId: string | undefined) {
  return useQuery({
    queryKey: ['dates', dateId ?? '', 'photos'] as const,
    enabled: !!dateId,
    queryFn: async (): Promise<DatePhoto[]> => {
      const { data, error } = await supabase
        .from('date_photos')
        .select('*')
        .eq('date_id', dateId as string)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
