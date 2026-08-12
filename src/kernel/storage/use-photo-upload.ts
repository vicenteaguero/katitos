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
        // A proxy that isn't smaller than what it replaces is not a proxy.
        // Skipping it makes readers fall back to the original, which is the
        // better of the two — this is how ~300 KB PNG "thumbnails" used to get
        // stored and then dutifully downloaded on every scroll.
        if (proxy.size < blob.size) {
          await supabase.storage.from(bucket).upload(proxyPath(path), proxy, {
            upsert: true,
            // The REAL type. Storing WebP bytes labelled image/jpeg happened to
            // work through content sniffing, but it is a lie to every cache.
            contentType: proxy.type || 'image/webp',
          });
        }
      } catch {
        // No proxy this time — the original is enough to display correctly.
      }
      return path;
    },
    [upload]
  );

  return { uploadPhoto, uploading, error };
}
