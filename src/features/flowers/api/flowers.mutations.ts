import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { useUserId } from '@kernel/auth';
import { BUCKETS, proxyPath, usePhotoUpload } from '@kernel/storage';
import { notifyPartner } from '@kernel/push';
import { qk } from '@kernel/query';
import { monthKey } from '../lib/months';

/**
 * Put a bouquet in a month (or replace the one that's there).
 *
 * Goes through `usePhotoUpload`, unlike the old version, so a thumbnail is
 * actually generated — a year of full-resolution photos three-across was going
 * to be brutal on her phone.
 */
export function useUpsertFlower() {
  const qc = useQueryClient();
  const userId = useUserId();
  const { uploadPhoto } = usePhotoUpload();

  return useMutation({
    mutationFn: async ({
      month,
      blob,
      note,
    }: {
      /** Any date in the month; normalized to the first. */
      month: string;
      blob: Blob;
      note?: string | null;
    }) => {
      const occasion = monthKey(month);
      // Versioned path so replacing a bouquet never overwrites the bytes of
      // the one it replaced — same rule as the polaroids.
      const path = `${occasion}/${Date.now()}.jpg`;
      await uploadPhoto(BUCKETS.flowers, path, blob);

      const { error } = await supabase.from('flowers').upsert(
        {
          occasion_date: occasion,
          image_path: path,
          note: note ?? null,
          ...(userId ? { uploaded_by: userId } : {}),
        },
        { onConflict: 'occasion_date' }
      );
      if (error) {
        await supabase.storage
          .from(BUCKETS.flowers)
          .remove([path, proxyPath(path)])
          .catch(() => {});
        throw error;
      }
      return { occasion };
    },
    onSuccess: ({ occasion }) => {
      void qc.invalidateQueries({ queryKey: qk.flowers.list() });
      void qc.invalidateQueries({ queryKey: ['signed-url'] });
      void qc.invalidateQueries({ queryKey: ['signed-urls'] });
      void notifyPartner({
        kind: 'wishlist',
        title: '💐 A new bouquet',
        body: `One for ${occasion.slice(0, 7)}`,
        url: '/flowers',
      });
    },
  });
}

export function useDeleteFlower() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; imagePath: string | null }) => {
      const { error } = await supabase.from('flowers').delete().eq('id', v.id);
      if (error) throw error;
      if (v.imagePath) {
        await supabase.storage
          .from(BUCKETS.flowers)
          .remove([v.imagePath, proxyPath(v.imagePath)])
          .catch(() => {});
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.flowers.list() }),
  });
}
