import { useCallback, useState } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import type { BucketName } from './buckets';
import { proxyPath } from './image';
import { forgetSignedUrl } from './use-signed-urls';

interface UploadOptions {
  upsert?: boolean;
  contentType?: string;
  /**
   * Seconds the browser may keep the bytes. Supabase's own default is 3600.
   * A path that is never written twice can say a year; a fixed path should
   * not say more than the hour it already implies.
   */
  cacheControl?: string;
}

/**
 * Forget every cached way of reaching an object that was just (re)written.
 *
 * A replaced file at the SAME path is a new body behind an old address. React
 * Query hands out the signed URL it already holds for up to an hour, and the
 * browser's HTTP cache answers that exact URL with the old bytes for as long
 * as `cacheControl` said - so a re-recorded word played the old clip until the
 * second try. New uploads take a fresh path wherever they can; this covers the
 * places that still write to a fixed one (avatars, bouquets, proof photos…),
 * and the service-worker cache, which keys by path and ignores the token.
 */
export async function evictStoredObject(
  qc: QueryClient,
  bucket: BucketName,
  path: string
): Promise<void> {
  const paths = [path, proxyPath(path)];
  for (const p of paths) {
    forgetSignedUrl(bucket, p);
    qc.removeQueries({ queryKey: ['signed-url', bucket, p] });
  }
  // Only the batches that actually hold this path. The whole bucket used to
  // be invalidated, so a forty-photo import refetched every mounted batch
  // forty times - the storm the album's bulk add had just been cured of.
  void qc.invalidateQueries({
    queryKey: ['signed-urls', bucket],
    predicate: (q) => {
      const wanted = q.queryKey[3];
      return Array.isArray(wanted) && paths.some((p) => wanted.includes(p));
    },
  });

  if (typeof caches === 'undefined') return;
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!base) return;
  const urls = [
    `${base}/storage/v1/object/sign/${bucket}/${path}`,
    `${base}/storage/v1/render/image/sign/${bucket}/${path}`,
  ];
  try {
    const names = (await caches.keys()).filter((k) =>
      k.startsWith('katitos-img')
    );
    await Promise.all(
      names.map(async (name) => {
        const cache = await caches.open(name);
        await Promise.all(
          urls.map((u) => cache.delete(u, { ignoreSearch: true }))
        );
      })
    );
  } catch {
    /* a cache we cannot reach is a cache that cannot serve stale bytes */
  }
}

/** Upload a Blob/File to a bucket path. Returns the stored path. */
export function useUpload() {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (
      bucket: BucketName,
      path: string,
      file: Blob,
      opts: UploadOptions = {}
    ): Promise<string> => {
      setUploading(true);
      setError(null);
      try {
        const { error: upErr } = await supabase.storage
          .from(bucket)
          .upload(path, file, {
            upsert: opts.upsert ?? true,
            cacheControl: opts.cacheControl ?? '3600',
            contentType:
              opts.contentType ||
              (file instanceof File ? file.type : undefined),
          });
        if (upErr) throw upErr;
        await evictStoredObject(qc, bucket, path);
        return path;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Upload failed';
        setError(msg);
        throw e;
      } finally {
        setUploading(false);
      }
    },
    [qc]
  );

  return { upload, uploading, error };
}
