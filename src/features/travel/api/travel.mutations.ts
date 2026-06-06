import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { TablesInsert } from '@kernel/supabase';
import type { TripItemKind } from '../types';

export type CreateTripInput = Pick<
  TablesInsert<'trips'>,
  | 'name'
  | 'destination'
  | 'start_date'
  | 'end_date'
  | 'budget_amount'
  | 'budget_currency'
>;

export function useCreateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTripInput) => {
      const { error } = await supabase.from('trips').insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.trips.list() }),
  });
}

export function useDeleteTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('trips').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.trips.list() }),
  });
}

export interface AddTripItemInput {
  tripId: string;
  kind: TripItemKind;
  title: string;
  description?: string | null;
  link?: string | null;
}

export function useAddTripItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tripId,
      kind,
      title,
      description,
      link,
    }: AddTripItemInput) => {
      const { error } = await supabase.from('trip_items').insert({
        trip_id: tripId,
        kind,
        title,
        description: description ?? null,
        link: link ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { tripId }) =>
      qc.invalidateQueries({ queryKey: qk.trips.items(tripId) }),
  });
}

export interface ToggleTripItemInput {
  id: string;
  tripId: string;
  status: 'open' | 'done';
}

export function useToggleTripItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: ToggleTripItemInput) => {
      const { error } = await supabase
        .from('trip_items')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, { tripId }) =>
      qc.invalidateQueries({ queryKey: qk.trips.items(tripId) }),
  });
}

export interface DeleteTripItemInput {
  id: string;
  tripId: string;
}

export function useDeleteTripItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: DeleteTripItemInput) => {
      const { error } = await supabase.from('trip_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, { tripId }) =>
      qc.invalidateQueries({ queryKey: qk.trips.items(tripId) }),
  });
}
