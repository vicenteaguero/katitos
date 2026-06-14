import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import { supabase } from '@kernel/supabase';
import { BUCKETS, storagePaths, usePhotoUpload } from '@kernel/storage';
import { qk } from '@kernel/query';
import { toast } from '@kernel/ui';
import { georgiaKeys } from '../types';

/**
 * Create the one special Georgia trip when none exists. Seeds only run on a DB
 * reset, so a fresh/cloud database has no trip row — this lets the couple open
 * the planner straight from the app instead of staring at an empty shell.
 */
export function useCreateGeorgiaTrip() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .insert({
          slug: 'georgia-2026',
          name: 'Georgia 2026',
          destination: 'Tbilisi, Georgia',
          start_date: '2026-07-07',
          end_date: '2026-08-04',
          is_special: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: georgiaKeys.trip() }),
  });
}

export function useAddGeorgiaItem() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (input: {
      tripId: string;
      kind: string;
      title: string;
      description?: string | null;
      day?: string | null;
      lat?: number | null;
      lng?: number | null;
    }) => {
      const { error } = await supabase.from('trip_items').insert({
        trip_id: input.tripId,
        kind: input.kind,
        title: input.title,
        description: input.description ?? null,
        day: input.day ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.trips.items(v.tripId) }),
  });
}

/** Patch any field on an item (assign a day, drop a pin, edit). */
export function useUpdateGeorgiaItem() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (v: {
      id: string;
      tripId: string;
      patch: {
        day?: string | null;
        lat?: number | null;
        lng?: number | null;
        status?: string;
      };
    }) => {
      const { error } = await supabase
        .from('trip_items')
        .update(v.patch)
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.trips.items(v.tripId) }),
  });
}

export function useToggleGeorgiaItem() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (v: { id: string; tripId: string; status: string }) => {
      const { error } = await supabase
        .from('trip_items')
        .update({ status: v.status })
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.trips.items(v.tripId) }),
  });
}

export function useDeleteGeorgiaItem() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (v: { id: string; tripId: string }) => {
      const { error } = await supabase
        .from('trip_items')
        .delete()
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: qk.trips.items(v.tripId) }),
  });
}

export function useAddGeorgiaPhoto() {
  const qc = useQueryClient();
  const { uploadPhoto } = usePhotoUpload();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (v: {
      tripId: string;
      blob: Blob;
      caption?: string | null;
    }) => {
      const fileId = nanoid(8);
      const path = storagePaths.tripPhoto(v.tripId, fileId);
      await uploadPhoto(BUCKETS.georgiaAlbum, path, v.blob);
      const { error } = await supabase.from('trip_photos').insert({
        trip_id: v.tripId,
        image_path: path,
        caption: v.caption ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: georgiaKeys.photos(v.tripId) }),
  });
}

export function useDeleteGeorgiaPhoto() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (v: { id: string; tripId: string }) => {
      const { error } = await supabase
        .from('trip_photos')
        .delete()
        .eq('id', v.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: georgiaKeys.photos(v.tripId) }),
  });
}
