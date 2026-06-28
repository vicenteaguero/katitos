import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import {
  summerKeys,
  type BudgetLine,
  type BudgetSprint,
  type PackingItem,
  type Trip,
  type TripItem,
  type TripLeg,
  type TripPhoto,
  type TripReview,
  type WorkBlock,
} from '../types';

/** The one special trip (Summer 2026). Looked up by is_special, not slug. */
export function useSummerTrip() {
  return useQuery({
    queryKey: summerKeys.trip(),
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

export function useSummerItems(tripId: string | undefined) {
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

export function useSummerPhotos(tripId: string | undefined) {
  return useQuery({
    queryKey: qk.trips.photos(tripId ?? 'none'),
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

export function useSummerLegs(tripId: string | undefined) {
  return useQuery({
    queryKey: qk.trips.legs(tripId ?? 'none'),
    enabled: !!tripId,
    queryFn: async (): Promise<TripLeg[]> => {
      const { data, error } = await supabase
        .from('trip_legs')
        .select('*')
        .eq('trip_id', tripId as string)
        .order('position', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSummerReviews(tripId: string | undefined) {
  return useQuery({
    queryKey: qk.trips.reviews(tripId ?? 'none'),
    enabled: !!tripId,
    queryFn: async (): Promise<TripReview[]> => {
      const { data, error } = await supabase
        .from('trip_reviews')
        .select('*')
        .eq('trip_id', tripId as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSummerSprints(tripId: string | undefined) {
  return useQuery({
    queryKey: qk.trips.sprints(tripId ?? 'none'),
    enabled: !!tripId,
    queryFn: async (): Promise<BudgetSprint[]> => {
      const { data, error } = await supabase
        .from('budget_sprints')
        .select('*')
        .eq('trip_id', tripId as string)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSummerLines(sprintIds: string[]) {
  const key = sprintIds.slice().sort().join(',');
  return useQuery({
    queryKey: ['trips', 'budget-lines', key] as const,
    enabled: sprintIds.length > 0,
    queryFn: async (): Promise<BudgetLine[]> => {
      const { data, error } = await supabase
        .from('budget_lines')
        .select('*')
        .in('sprint_id', sprintIds)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSummerPacking(tripId: string | undefined) {
  return useQuery({
    queryKey: qk.trips.packing(tripId ?? 'none'),
    enabled: !!tripId,
    queryFn: async (): Promise<PackingItem[]> => {
      const { data, error } = await supabase
        .from('packing_items')
        .select('*')
        .eq('trip_id', tripId as string)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useWorkBlocks(fromISO: string, toISO: string) {
  return useQuery({
    queryKey: qk.work.week(fromISO),
    queryFn: async (): Promise<WorkBlock[]> => {
      const { data, error } = await supabase
        .from('work_blocks')
        .select('*')
        .gte('day', fromISO)
        .lte('day', toISO)
        .order('start_min', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
