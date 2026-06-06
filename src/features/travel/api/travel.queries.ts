import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { Trip, TripItem } from '../types';

/** Normal (non-special) trips, newest first. The "Georgia" trip is excluded. */
export function useTrips() {
  return useQuery({
    queryKey: qk.trips.list(),
    queryFn: async (): Promise<Trip[]> => {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('is_special', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTrip(id: string | undefined) {
  return useQuery({
    queryKey: qk.trips.one(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<Trip> => {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', id ?? '')
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useTripItems(tripId: string | undefined) {
  return useQuery({
    queryKey: qk.trips.items(tripId ?? ''),
    enabled: !!tripId,
    queryFn: async (): Promise<TripItem[]> => {
      const { data, error } = await supabase
        .from('trip_items')
        .select('*')
        .eq('trip_id', tripId ?? '')
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
