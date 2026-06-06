import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import { supabase } from '@kernel/supabase';
import type { TablesInsert, TablesUpdate } from '@kernel/supabase';
import { BUCKETS, storagePaths, useUpload } from '@kernel/storage';
import { qk } from '@kernel/query';
import type { DateStatus } from '../types';

interface CreateDateInput {
  title: string;
  place?: string | null;
  category?: string | null;
  status: DateStatus;
  scheduled_at?: string | null;
}

/** Create a date (idea/scheduled/…). */
export function useCreateDate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateDateInput): Promise<string> => {
      const payload: TablesInsert<'dates'> = {
        title: input.title,
        place: input.place ?? null,
        category: input.category ?? null,
        status: input.status,
        scheduled_at: input.scheduled_at ?? null,
      };
      const { data, error } = await supabase
        .from('dates')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.dates.all() }),
  });
}

/** Patch any column on a date. */
export function useUpdateDate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: TablesUpdate<'dates'> & { id: string }) => {
      const { error } = await supabase.from('dates').update(patch).eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      void qc.invalidateQueries({ queryKey: qk.dates.list() });
      void qc.invalidateQueries({ queryKey: qk.dates.one(id) });
    },
  });
}

/** Delete a date (cascades to ratings/photos server-side). */
export function useDeleteDate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.dates.all() }),
  });
}

/** Upsert the current user's star rating + review for a date. */
export function useSetRating() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dateId,
      stars,
      review,
    }: {
      dateId: string;
      stars: number;
      review?: string | null;
    }) => {
      // user_id defaults to auth.uid() on the server.
      const { error } = await supabase
        .from('date_ratings')
        .upsert(
          { date_id: dateId, stars, review: review ?? null },
          { onConflict: 'date_id,user_id' }
        );
      if (error) throw error;
    },
    onSuccess: (_data, { dateId }) => {
      void qc.invalidateQueries({ queryKey: qk.dates.one(dateId) });
      void qc.invalidateQueries({ queryKey: qk.dates.list() });
    },
  });
}

/** Upload a photo blob then attach it to a date. */
export function useAddDatePhoto() {
  const qc = useQueryClient();
  const { upload } = useUpload();
  return useMutation({
    mutationFn: async ({
      dateId,
      blob,
      caption,
    }: {
      dateId: string;
      blob: Blob;
      caption?: string | null;
    }) => {
      const fileId = nanoid(8);
      const path = storagePaths.datePhoto(dateId, fileId);
      await upload(BUCKETS.datesAlbum, path, blob, {
        upsert: true,
        contentType: 'image/jpeg',
      });
      const { error } = await supabase.from('date_photos').insert({
        date_id: dateId,
        image_path: path,
        caption: caption ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { dateId }) => {
      void qc.invalidateQueries({ queryKey: ['dates', dateId, 'photos'] });
    },
  });
}

/** Remove a photo row (storage object is left in the bucket). */
export function useDeleteDatePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; dateId: string }) => {
      const { error } = await supabase
        .from('date_photos')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, { dateId }) => {
      void qc.invalidateQueries({ queryKey: ['dates', dateId, 'photos'] });
    },
  });
}
