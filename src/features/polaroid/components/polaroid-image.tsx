import { useState } from 'react';
import { BUCKETS, useSignedUrl } from '@kernel/storage';
import { Spinner } from '@kernel/ui';
import { cn } from '@kernel/lib';

export function PolaroidImage({
  path,
  alt,
  className,
}: {
  path: string;
  alt?: string;
  className?: string;
}) {
  const { data: url, isLoading } = useSignedUrl(BUCKETS.polaroids, path);
  // Presentation-only: the emulsion "fixes" once the bytes arrive, driving the
  // develop reveal. No data/behavior change — purely the instant-photo effect.
  const [developed, setDeveloped] = useState(false);

  if (isLoading || !url) {
    return (
      <div
        className={cn(
          // A blank, over-exposed plate waiting in the developing tray.
          'relative flex items-center justify-center overflow-hidden bg-surface-2 marble',
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
    <span className={cn('relative block overflow-hidden bg-brown', className)}>
      <img
        src={url}
        alt={alt ?? 'polaroid'}
        onLoad={() => setDeveloped(true)}
        className={cn(
          'h-full w-full object-cover',
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
    </span>
  );
}
