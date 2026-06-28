import { useState } from 'react';
import { BUCKETS, useProxiedUrl } from '@kernel/storage';
import { Spinner } from '@kernel/ui';
import { cn } from '@kernel/lib';
import '../polaroid.css';

export function PolaroidImage({
  path,
  alt,
  className,
  full = false,
}: {
  path: string;
  alt?: string;
  className?: string;
  /** Load the full-resolution original (zoom/download); default is the proxy. */
  full?: boolean;
}) {
  const { proxyUrl, fullUrl, isLoading } = useProxiedUrl(
    BUCKETS.polaroids,
    path
  );
  // Default to the lightweight proxy; on a full view (or when a legacy photo
  // has no proxy and the proxy URL errors) we show the original instead.
  const [forceFull, setForceFull] = useState(false);
  const src = full || forceFull ? fullUrl : (proxyUrl ?? fullUrl);

  // Presentation-only: the emulsion "fixes" once the bytes arrive, driving the
  // develop reveal. No data/behavior change — purely the instant-photo effect.
  const [developed, setDeveloped] = useState(false);

  if (!src) {
    return (
      <div
        className={cn(
          // A blank, over-exposed plate waiting in the developing tray.
          'relative flex items-center justify-center overflow-hidden rounded-md bg-surface-2 marble',
          className
        )}
      >
        <span
          className="pointer-events-none absolute inset-0 polaroid-warmth"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(75% 60% at 50% 45%, rgb(181 99 58 / 0.22), transparent 72%)',
          }}
        />
        {isLoading && <Spinner />}
      </div>
    );
  }

  return (
    <span
      className={cn(
        'relative block overflow-hidden rounded-md bg-brown',
        className
      )}
    >
      <img
        src={src}
        alt={alt ?? 'polaroid'}
        decoding="async"
        loading="lazy"
        onLoad={() => setDeveloped(true)}
        // Proxy missing (a photo from before proxies) → fall back to the full one.
        onError={() => !forceFull && !full && setForceFull(true)}
        className={cn(
          'h-full w-full rounded-md object-cover',
          developed ? 'polaroid-develop' : 'opacity-0'
        )}
      />
      {/* The over-exposed wash that fixes off as the picture comes up. */}
      {developed && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 polaroid-fix"
          style={{
            background:
              'radial-gradient(80% 70% at 50% 40%, rgb(232 217 181 / 0.55), rgb(181 99 58 / 0.18) 60%, transparent 85%)',
            mixBlendMode: 'screen',
          }}
        />
      )}
      {/* A single chemical sheen glides across as the hero plate fixes. */}
      {developed && full && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 polaroid-sheen"
          style={{
            background:
              'linear-gradient(105deg, transparent 38%, rgb(255 241 201 / 0.5) 50%, transparent 62%)',
            mixBlendMode: 'screen',
          }}
        />
      )}
    </span>
  );
}
