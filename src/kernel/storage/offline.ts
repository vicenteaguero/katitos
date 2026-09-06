import type { BucketName } from './buckets';

/**
 * An address for an object we may already hold, with no signature on it.
 *
 * The service worker caches storage objects by PATH and ignores the query
 * string, so any token - even a made-up one - reaches the cached bytes.
 * That is what makes a recording playable on a train: nothing here can
 * sign a URL offline, and nothing needs to.
 */
export function offlineUrl(bucket: BucketName, path: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  return `${base}/storage/v1/object/sign/${bucket}/${path}?token=offline`;
}

/** The offline address, only if the bytes are actually on this device. */
export async function cachedOffline(
  bucket: BucketName,
  path: string
): Promise<string | null> {
  if (typeof caches === 'undefined') return null;
  const url = offlineUrl(bucket, path);
  try {
    const hit = await caches.match(url, { ignoreSearch: true });
    return hit ? url : null;
  } catch {
    return null;
  }
}

/** Are we, right now, without a network? */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}
