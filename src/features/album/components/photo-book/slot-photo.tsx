import { useState } from 'react';
import { BUCKETS, useProxiedUrl } from '@kernel/storage';
import type { PhotoSource } from '../../types';

/**
 * Render a slot's image. Uploads live in the album bucket; polaroids are shown
 * straight from the polaroids bucket. Prefers the fast proxy, falling back to
 * the full original if the proxy is missing (older photos predate proxies).
 */
export function SlotPhoto({
  source,
  path,
  alt,
}: {
  source: PhotoSource;
  path: string | null;
  alt: string;
}) {
  const bucket = source === 'polaroid' ? BUCKETS.polaroids : BUCKETS.album;
  const { proxyUrl, fullUrl } = useProxiedUrl(bucket, path);
  const [proxyFailed, setProxyFailed] = useState(false);
  const src = !proxyFailed && proxyUrl ? proxyUrl : fullUrl;

  if (!src) return <div className="pb-photo" aria-hidden="true" />;
  return (
    <img
      className="pb-photo"
      src={src}
      alt={alt}
      draggable={false}
      onError={() => setProxyFailed(true)}
    />
  );
}
