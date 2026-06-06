import type { Tables } from '@kernel/supabase';

export type Trip = Tables<'trips'>;
export type TripItem = Tables<'trip_items'>;
export type TripPhoto = Tables<'trip_photos'>;

export const georgiaKeys = {
  trip: () => ['georgia', 'trip'] as const,
  photos: (tripId: string) => ['georgia', 'photos', tripId] as const,
};
