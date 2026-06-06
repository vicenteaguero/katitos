import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import { supabase } from '@kernel/supabase';
import { BUCKETS, storagePaths, useUpload } from '@kernel/storage';
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
    }) => {
      const { error } = await supabase.from('trip_items').insert({
        trip_id: input.tripId,
        kind: input.kind,
        title: input.title,
        description: input.description ?? null,
      });
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
  const { upload } = useUpload();
  return useMutation({
    mutationFn: async (v: {
      tripId: string;
      blob: Blob;
      caption?: string | null;
    }) => {
      const fileId = nanoid(8);
      const path = storagePaths.tripPhoto(v.tripId, fileId);
      await upload(BUCKETS.georgiaAlbum, path, v.blob, {
        contentType: 'image/jpeg',
      });
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
