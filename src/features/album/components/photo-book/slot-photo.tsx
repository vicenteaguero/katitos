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
  blur,
  alt,
  eager,
  onMeasured,
}: {
  source: PhotoSource;
  path: string | null;
  url?: string;
  /** The postage-stamp stored on the row: shown until the real one arrives. */
  blur?: string | null;
  alt: string;
  /** The page being read right now — its photos are not "later". */
  eager?: boolean;
  /**
   * The picture's real shape, once the browser knows it.
   *
   * Every photo taken before this release has no width or height stored, and a
   * sticker with no ratio and no fixed height collapses to a sliver. Reporting
   * it on load lets the row be filled in once and be right from then on.
   */
  onMeasured?: (size: { width: number; height: number }) => void;
}) {
  const bucket = source === 'polaroid' ? BUCKETS.polaroids : BUCKETS.album;
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  // Nothing is signed here while the book's batched URL is working — that is
  // the whole point of the batch. But the moment it 404s we DO need the
  // original signed, and asking for it only in that case is what the old
  // `url ? undefined : path` could never do: it had already decided.
  const { proxyUrl, fullUrl } = useProxiedUrl(
    bucket,
    url && !failed ? undefined : path,
    { proxy: !url, full: true }
  );

  // A photo uploaded before proxies existed has no `thumbs/` twin, so the
  // batched URL the book handed us 404s. The `??` chain here used to
  // short-circuit on `url` and never consult `failed` at all — which is why
  // those photos showed a permanent hole with no fallback underneath them.
  const src = failed ? (fullUrl ?? undefined) : (url ?? proxyUrl ?? fullUrl);

  if (!src && !blur) return <div className="pb-photo" aria-hidden="true" />;
  return (
    <>
      {blur && (
        // Underneath, always: the real photograph fades in on top of it, so
        // there is never a grey hole where a picture is going to be.
        <span
          className="pb-photo pb-photo-blur"
          aria-hidden="true"
          style={{ backgroundImage: `url(${blur})` }}
        />
      )}
      {src && (
        <img
          className="pb-photo"
          src={src}
          alt={alt}
          draggable={false}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={eager ? 'high' : 'auto'}
          style={blur ? { opacity: ready ? 1 : 0 } : undefined}
          // Fall back to the original ONCE. Without the guard a photo that has
          // neither copy would re-render itself forever.
          onError={() => setFailed(true)}
          onLoad={(e) => {
            setReady(true);
            const img = e.currentTarget;
            if (img.naturalWidth && img.naturalHeight) {
              onMeasured?.({
                width: img.naturalWidth,
                height: img.naturalHeight,
              });
            }
          }}
        />
      )}
    </>
  );
}
