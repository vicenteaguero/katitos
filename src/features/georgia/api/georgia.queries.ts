import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import {
  georgiaKeys,
  type Trip,
  type TripItem,
  type TripPhoto,
} from '../types';

export function useGeorgiaTrip() {
  return useQuery({
    queryKey: georgiaKeys.trip(),
    queryFn: async (): Promise<Trip | null> => {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('is_special', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useGeorgiaItems(tripId: string | undefined) {
  return useQuery({
    queryKey: qk.trips.items(tripId ?? 'none'),
    enabled: !!tripId,
    queryFn: async (): Promise<TripItem[]> => {
      const { data, error } = await supabase
        .from('trip_items')
        .select('*')
        .eq('trip_id', tripId as string)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useGeorgiaPhotos(tripId: string | undefined) {
  return useQuery({
    queryKey: georgiaKeys.photos(tripId ?? 'none'),
    enabled: !!tripId,
    queryFn: async (): Promise<TripPhoto[]> => {
      const { data, error } = await supabase
        .from('trip_photos')
        .select('*')
        .eq('trip_id', tripId as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
