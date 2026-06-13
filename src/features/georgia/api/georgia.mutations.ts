import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import { supabase } from '@kernel/supabase';
import { BUCKETS, storagePaths, usePhotoUpload } from '@kernel/storage';
import { qk } from '@kernel/query';
import { georgiaKeys } from '../types';

export function useAddGeorgiaItem() {
  const qc = useQueryClient();
  return useMutation({
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
