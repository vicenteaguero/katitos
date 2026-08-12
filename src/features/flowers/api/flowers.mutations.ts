import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { useUserId } from '@kernel/auth';
import { BUCKETS, proxyPath, usePhotoUpload } from '@kernel/storage';
import { notifyPartner } from '@kernel/push';
import { qk } from '@kernel/query';
import { currentMonthUtc, monthKey } from '../lib/months';

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
    }: {
      /** Any date in the month; normalized to the first. */
      month: string;
      blob: Blob;
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

      // Only THIS month's bouquet is news. Backfilling last spring is tidying
      // up an album, and a phone buzzing for each one would be noise — the
      // exact reason most of the app's other pings were muted for months.
      if (occasion.slice(0, 7) === currentMonthUtc()) {
        void notifyPartner({
          kind: 'flower',
          title: '💐 A new bouquet',
          body: 'One for this month',
          url: '/flowers',
        });
      }
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
