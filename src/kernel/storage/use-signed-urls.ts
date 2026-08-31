import { useMemo } from 'react';
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
const entriesToMap = (entries: Array<[string, string]>) => new Map(entries);

/**
 * Every signature we have handed out, by bucket and path.
 *
 * Two screens signing the SAME object get two different tokens, so the strip
 * and the book each had their own URL for one photograph — a different address
 * for bytes the browser already had, plus a round trip before it could even
 * ask for them. That is the loading flash when a photo already sitting in the
 * strip is placed on a page.
 *
 * Everything that signs writes here, and anything can read a signature that
 * already exists rather than asking for a second one.
 */
const signed = new Map<string, { url: string; expiresAt: number }>();

const memoKey = (bucket: BucketName, path: string) => `${bucket}|${path}`;

/**
 * A signature we already hold for this object, if it has life left in it.
 *
 * Synchronous and free: no query, no request. `undefined` simply means nobody
 * has signed this path yet in this session.
 */
export function peekSignedUrl(
  bucket: BucketName,
  path: string | null | undefined
): string | undefined {
  if (!path) return undefined;
  const hit = signed.get(memoKey(bucket, path));
  if (!hit) return undefined;
  // A minute of headroom, the same margin `staleTime` uses.
  if (hit.expiresAt - 60_000 < Date.now()) {
    signed.delete(memoKey(bucket, path));
    return undefined;
  }
  return hit.url;
}

/** Drop a remembered signature — the object behind it has been replaced. */
export function forgetSignedUrl(bucket: BucketName, path: string): void {
  signed.delete(memoKey(bucket, path));
}

export function useSignedUrls(
  bucket: BucketName,
  paths: Array<string | null | undefined>,
  {
    proxy = true,
    expiresIn = 3600,
    enabled = true,
  }: { proxy?: boolean; expiresIn?: number; enabled?: boolean } = {}
) {
  // Stable, de-duplicated key: the same photo listed twice is signed once, and
  // a re-render with an equal list doesn't refetch. NOTE the sort — the
  // returned Map is in no caller-meaningful order, so anything that cares about
  // the order photos APPEAR in must order its own prefetch list.
  // Memoised: this runs on every render and TanStack then stringifies it to
  // hash the query key — hundreds of paths, sixty times a second during a
  // drag.
  const wanted = useMemo(
    () => [...new Set(paths.filter((p): p is string => !!p))].sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paths.join('\u0000')]
  );

  return useQuery({
    queryKey: ['signed-urls', bucket, proxy, wanted],
    enabled: enabled && wanted.length > 0,
    // Refresh a minute before the signatures actually lapse.
    staleTime: Math.max(0, (expiresIn - 60) * 1000),
    // …and actually GO and refresh. Being stale is not the same as being
    // refetched: the app turns off `refetchOnWindowFocus`, so nothing ever
    // asked again, and a book left open for over an hour quietly started
    // serving 403s for every photograph in it. An evening spent building an
    // album is exactly that long.
    refetchInterval: Math.max(60_000, (expiresIn - 60) * 1000),
    refetchIntervalInBackground: false,
    // Adding ONE photo changes the path list, which changes the key, which
    // would otherwise blank every already-signed photo on screen until the new
    // batch came back — a whole page flashing because one sticker was placed.
    // Hold the last answer while the next one is on its way.
    placeholderData: (prev: Array<[string, string]> | undefined) => prev,
    queryFn: async (): Promise<Array<[string, string]>> => {
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
      // Entries, not a Map: query data must stay JSON-serializable (the cache
      // is snapshotted to localStorage). `select` turns it back into a Map.
      const out: Array<[string, string]> = [];
      const expiresAt = Date.now() + expiresIn * 1000;
      for (const row of data ?? []) {
        if (!row?.signedUrl || !row.path) continue;
        const original = backToOriginal.get(row.path);
        if (!original) continue;
        out.push([original, row.signedUrl]);
        // Remembered under the ORIGINAL path, which is what callers hold.
        signed.set(memoKey(bucket, original), {
          url: row.signedUrl,
          expiresAt,
        });
      }
      return out;
    },
    // A STABLE function reference. TanStack only reuses the previous select
    // result when `options.select === the stored one`, so an inline arrow
    // re-ran on every render and handed back a brand-new Map — which broke
    // every `useMemo` and `memo` downstream of it, all the way to the flip
    // book tearing down and rebuilding its DOM mid-gesture.
    select: entriesToMap,
  });
}
