import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import type { BucketName } from './buckets';
import { proxyPath } from './image';

/**
 * Sign MANY paths in ONE request.
 *
 * `useSignedUrl` costs a round-trip per path, and `useProxiedUrl` costs two
 * (proxy + original) — so a gallery of 100 photos opened 200 sequential
 * requests before a single pixel arrived. That, not image weight, was what
 * made the album feel slow. `createSignedUrls` signs the whole batch at once.
 *
 * Returns a `Map<path, url>` keyed by the ORIGINAL path (not the proxy path),
 * so callers look photos up by the value they already hold.
 */
export function useSignedUrls(
  bucket: BucketName,
  paths: Array<string | null | undefined>,
  {
    proxy = true,
    expiresIn = 3600,
  }: { proxy?: boolean; expiresIn?: number } = {}
) {
  // Stable, de-duplicated key: the same photo listed twice is signed once, and
  // a re-render with an equal list doesn't refetch.
  const wanted = [...new Set(paths.filter((p): p is string => !!p))].sort();

  return useQuery({
    queryKey: ['signed-urls', bucket, proxy, wanted],
    enabled: wanted.length > 0,
    // Refresh a minute before the signatures actually lapse.
    staleTime: Math.max(0, (expiresIn - 60) * 1000),
    queryFn: async (): Promise<Map<string, string>> => {
      const targets = proxy ? wanted.map(proxyPath) : wanted;
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrls(targets, expiresIn);
      if (error) throw error;

      // Map results back by their returned `path`, never by array index — the
      // API makes no ordering promise, and a silent off-by-one here would show
      // the wrong photo for the wrong day.
      const backToOriginal = new Map(targets.map((t, i) => [t, wanted[i]]));

      // Per-item `signedUrl`/`error` are nullable: a photo taken before proxies
      // existed simply has no `thumbs/` object. That's an expected miss, not a
      // failure — it comes back as an absent map entry and the consumer falls
      // back to the original.
      const out = new Map<string, string>();
      for (const row of data ?? []) {
        if (!row?.signedUrl || !row.path) continue;
        const original = backToOriginal.get(row.path);
        if (original) out.set(original, row.signedUrl);
      }
      return out;
    },
  });
}
