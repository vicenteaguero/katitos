import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import type { BucketName } from './buckets';
import { proxyPath } from './image';

/** Resolve a signed URL for a private-bucket object path. */
export function useSignedUrl(
  bucket: BucketName,
  path: string | null | undefined,
  expiresIn = 3600
) {
  return useQuery({
    queryKey: ['signed-url', bucket, path],
    enabled: !!path,
    staleTime: Math.max(0, (expiresIn - 60) * 1000),
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path as string, expiresIn);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

/**
 * Signed URLs for both the small proxy and the full original. Thumbnails use
 * `proxyUrl` (fast); a full-screen view or download uses `fullUrl`. If a photo
 * predates proxies, the proxy URL simply fails to load and the consumer falls
 * back to `fullUrl`.
 */
export function useProxiedUrl(
  bucket: BucketName,
  path: string | null | undefined
) {
  const proxy = useSignedUrl(bucket, path ? proxyPath(path) : undefined);
  const full = useSignedUrl(bucket, path);
  return {
    proxyUrl: proxy.data,
    fullUrl: full.data,
    isLoading: proxy.isLoading || full.isLoading,
  };
}
