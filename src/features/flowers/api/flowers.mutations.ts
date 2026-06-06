import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { BUCKETS, storagePaths, useUpload } from '@kernel/storage';
import { qk } from '@kernel/query';

/** Register/replace a monthsversary bouquet: upload the blob then upsert the row. */
export function useUpsertFlower() {
  const qc = useQueryClient();
  const { upload } = useUpload();
  return useMutation({
    mutationFn: async ({
      occasionDate,
      blob,
      note,
    }: {
      occasionDate: string;
      blob: Blob;
      note?: string | null;
    }) => {
      const path = storagePaths.flower(occasionDate);
      await upload(BUCKETS.flowers, path, blob, {
        upsert: true,
        contentType: 'image/jpeg',
      });
      const { error } = await supabase
        .from('flowers')
        .upsert(
          { occasion_date: occasionDate, image_path: path, note: note ?? null },
          { onConflict: 'occasion_date' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.flowers.list() });
      // bust signed-url cache so the refreshed image reloads
      void qc.invalidateQueries({ queryKey: ['signed-url'] });
    },
  });
}

export function useDeleteFlower() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('flowers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.flowers.list() }),
  });
}
