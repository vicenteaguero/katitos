import { useEffect, useState } from 'react';
import { BUCKETS, useProxiedUrl } from '@kernel/storage';
import { Spinner } from '@kernel/ui';
import { cn } from '@kernel/lib';
import '../polaroid.css';

export function PolaroidImage({
  path,
  alt,
  className,
  full = false,
  src: presigned,
}: {
  path: string;
  alt?: string;
  className?: string;
  /**
   * A full view (the lightbox). Shows the small proxy at once and swaps in the
   * original behind it - waiting on the full file first meant a blank plate
   * every time you tapped a photo.
   */
  full?: boolean;
  /**
   * A URL the parent already signed in a batch. When present we skip this
   * component's own round-trips entirely - which is the whole point: a gallery
   * of N photos used to open 2N signed-URL requests from inside its children.
   */
  src?: string;
}) {
  // Presentation-only: the emulsion "fixes" once the bytes arrive, driving the
  // develop reveal. No data/behavior change - purely the instant-photo effect.
  const [developed, setDeveloped] = useState(false);
  // Proxy missing (a photo from before proxies) → fall back to the original.
  const [proxyGone, setProxyGone] = useState(false);
  // The original has finished downloading and can replace the proxy.
  const [fullReady, setFullReady] = useState(false);

  // Sign what we actually need. A thumbnail never needs the original; a full
  // view wants both, so it can show something immediately.
  const needsOwnProxy = !presigned && !proxyGone;
  const { proxyUrl, fullUrl, isLoading, proxyMissing } = useProxiedUrl(
    BUCKETS.polaroids,
    path,
    { proxy: needsOwnProxy, full: full || proxyGone }
  );
  if (proxyMissing && !proxyGone) setProxyGone(true);

  const small = presigned ?? proxyUrl;

  // Quietly fetch the original behind the proxy, then swap. The browser has it
  // cached by the time we change `src`, so there is no flash.
  useEffect(() => {
    if (!full || !fullUrl) return;
    setFullReady(false);
    let cancelled = false;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (!cancelled) setFullReady(true);
    };
    img.src = fullUrl;
    return () => {
      cancelled = true;
      img.src = '';
    };
  }, [full, fullUrl]);

  const src = full
    ? fullReady
      ? fullUrl
      : (small ?? fullUrl)
    : (small ?? fullUrl);

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
        // No background of its own. The photo's corners are rounded, so
        // whatever sits behind them shows through - and a colour here meant
        // that was four dark notches of "app background" punched into the
        // cream film. Let the plate underneath show instead.
        'relative block overflow-hidden rounded-md',
        className
      )}
    >
      <img
        src={src}
        alt={alt ?? 'polaroid'}
        decoding="async"
        // Not lazy: the gallery prefetches its whole page, so by the time this
        // mounts the bytes are already in cache. Lazy only delayed them.
        onLoad={() => setDeveloped(true)}
        // The proxy 404'd (a photo from before proxies) → go get the original.
        onError={() => !proxyGone && setProxyGone(true)}
        className={cn(
          // Exactly the container's radius, never more: a photo rounded harder
          // than the window it sits in cuts its own corners off.
          'h-full w-full rounded-[inherit] object-cover',
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
