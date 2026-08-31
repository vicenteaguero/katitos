import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import type { BucketName } from './buckets';
import { proxyPath } from './image';
import { cachedOffline, isOffline } from './offline';

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
    // …and actually go and refresh it. The app turns off refetch-on-focus,
    // so a stale signature was never asked for again while the screen stayed
    // open — after an evening lesson the play button quietly did nothing.
    // The batch hook had this fix already; this one never got it.
    refetchInterval: Math.max(60_000, (expiresIn - 60) * 1000),
    refetchIntervalInBackground: false,
    // Runs offline too — that is the whole point of the branch below. The
    // default mode would leave the query pending until the network is back.
    networkMode: 'offlineFirst',
    queryFn: async () => {
      // No network: an address the worker's cache will answer, if it holds
      // the bytes — a recording played once keeps playing on a train.
      if (isOffline()) {
        const held = await cachedOffline(bucket, path as string);
        if (held) return held;
        throw new Error('Not on this device');
      }
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path as string, expiresIn);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

interface ProxiedOptions {
  /** Sign the small `thumbs/` proxy. */
  proxy?: boolean;
  /** Sign the full-resolution original. */
  full?: boolean;
}

/**
 * Signed URLs for the small proxy and/or the full original. Thumbnails use
 * `proxyUrl` (fast); a full-screen view or download uses `fullUrl`. If a photo
 * predates proxies, the proxy URL simply fails to load and the consumer falls
 * back to `fullUrl`.
 *
 * Both halves default to on for backwards compatibility, but callers should say
 * what they need: a list view that only ever renders thumbnails was signing the
 * full-resolution original for every single photo and throwing it away, which
 * doubled the request count of the slowest screen in the app.
 */
export function useProxiedUrl(
  bucket: BucketName,
  path: string | null | undefined,
  { proxy = true, full = true }: ProxiedOptions = {}
) {
  const proxyQ = useSignedUrl(
    bucket,
    path && proxy ? proxyPath(path) : undefined
  );
  const fullQ = useSignedUrl(bucket, path && full ? path : undefined);
  return {
    proxyUrl: proxyQ.data,
    fullUrl: fullQ.data,
    isLoading: proxyQ.isLoading || fullQ.isLoading,
    /**
     * The proxy doesn't exist (a photo taken before proxies, or one whose
     * downscale failed). Consumers must fall back to the original — otherwise
     * the photo silently never renders.
     */
    proxyMissing: proxy && !!path && proxyQ.isError,
  };
}
