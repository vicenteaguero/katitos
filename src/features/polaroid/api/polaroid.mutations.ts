import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { BUCKETS, storagePaths, useUpload } from '@kernel/storage';
import { qk } from '@kernel/query';

/** Capture/replace today's polaroid: upload the blob then upsert the row. */
export function useUpsertPolaroid() {
  const qc = useQueryClient();
  const { upload } = useUpload();
  return useMutation({
    mutationFn: async ({
      day,
      blob,
      caption,
    }: {
      day: string;
      blob: Blob;
      caption?: string | null;
    }) => {
      const path = storagePaths.polaroid(day);
      await upload(BUCKETS.polaroids, path, blob, {
        upsert: true,
        contentType: 'image/jpeg',
      });
      const { error } = await supabase
        .from('polaroids')
        .upsert(
          { day, image_path: path, caption: caption ?? null },
          { onConflict: 'day' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.polaroids.all() });
      // bust signed-url cache so the refreshed image reloads
      void qc.invalidateQueries({ queryKey: ['signed-url'] });
    },
  });
}

export function useSetPolaroidCaption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ day, caption }: { day: string; caption: string }) => {
      const { error } = await supabase
        .from('polaroids')
        .update({ caption })
        .eq('day', day);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.polaroids.all() }),
  });
}
