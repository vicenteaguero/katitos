import { useState } from 'react';
import { BUCKETS, useProxiedUrl } from '@kernel/storage';
import { Spinner } from '@kernel/ui';
import { cn } from '@kernel/lib';

export function GeorgiaPhoto({
  path,
  className,
  full = false,
}: {
  path: string;
  className?: string;
  /** Load the full-resolution original (zoom/download); default is the proxy. */
  full?: boolean;
}) {
  const { proxyUrl, fullUrl, isLoading } = useProxiedUrl(
    BUCKETS.georgiaAlbum,
    path
  );
  const [forceFull, setForceFull] = useState(false);
  const src = full || forceFull ? fullUrl : (proxyUrl ?? fullUrl);

  if (!src) {
    return (
      <div
        className={cn('flex items-center justify-center bg-lapis', className)}
      >
        {isLoading && <Spinner />}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      onError={() => !forceFull && !full && setForceFull(true)}
      className={cn('rounded-none object-cover', className)}
    />
  );
}
