import { useCallback } from 'react';
import { supabase } from '@kernel/supabase';
import type { BucketName } from './buckets';
import { useUpload } from './use-upload';
import { downscaleImage, proxyPath } from './image';

/**
 * Upload a photo as an original + a small proxy (`thumbs/<path>`). The proxy is
 * best-effort: if downscaling or its upload fails, we keep the original and move
 * on — display falls back to the full image. Returns the original path.
 */
export function usePhotoUpload() {
  const { upload, uploading, error } = useUpload();

  const uploadPhoto = useCallback(
    async (bucket: BucketName, path: string, blob: Blob): Promise<string> => {
      await upload(bucket, path, blob, {
        upsert: true,
        contentType: 'image/jpeg',
      });
      try {
        const proxy = await downscaleImage(blob);
        await supabase.storage.from(bucket).upload(proxyPath(path), proxy, {
          upsert: true,
          contentType: 'image/jpeg',
        });
      } catch {
        // No proxy this time — the original is enough to display correctly.
      }
      return path;
    },
    [upload]
  );

  return { uploadPhoto, uploading, error };
}
