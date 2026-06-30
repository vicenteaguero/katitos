import { useState } from 'react';
import { BUCKETS, useProxiedUrl } from '@kernel/storage';
import { cn } from '@kernel/lib';

export function ScavengerProofImage({
  path,
  className,
}: {
  path: string;
  className?: string;
}) {
  // Prefer the small WebP proxy (fast); fall back to the full image on miss.
  const { proxyUrl, fullUrl } = useProxiedUrl(BUCKETS.scavengerProof, path);
  const [proxyFailed, setProxyFailed] = useState(false);
  const src = !proxyFailed && proxyUrl ? proxyUrl : fullUrl;
  if (!src) {
    return <div className={cn('bg-surface-2', className)} aria-hidden="true" />;
  }
  return (
    <img
      src={src}
      alt="proof"
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setProxyFailed(true)}
    />
  );
}
