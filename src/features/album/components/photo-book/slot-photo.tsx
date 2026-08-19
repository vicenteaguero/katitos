import { useState } from 'react';
import { BUCKETS, useProxiedUrl } from '@kernel/storage';
import type { PhotoSource } from '../../types';

/**
 * A sticker's image.
 *
 * Pass `url` and this is a plain `<img>` — the book signs every photo in ONE
 * batched request and hands each page its slice, instead of the two signing
 * round-trips per photo this component used to fire on its own. The `path`
 * fallback stays for the odd lone photo outside the book.
 */
export function SlotPhoto({
  source,
  path,
  url,
  alt,
}: {
  source: PhotoSource;
  path: string | null;
  url?: string;
  alt: string;
}) {
  const bucket = source === 'polaroid' ? BUCKETS.polaroids : BUCKETS.album;
  // Only signs when the book didn't already do it for us.
  const { proxyUrl, fullUrl } = useProxiedUrl(bucket, url ? undefined : path);
  const [failed, setFailed] = useState(false);
  const src = url ?? (!failed && proxyUrl ? proxyUrl : fullUrl);

  if (!src) return <div className="pb-photo" aria-hidden="true" />;
  return (
    <img
      className="pb-photo"
      src={src}
      alt={alt}
      draggable={false}
      loading="lazy"
      decoding="async"
      // A photo from before proxies existed has no `thumbs/` twin; fall back to
      // the original rather than showing a hole.
      onError={() => setFailed(true)}
    />
  );
}
