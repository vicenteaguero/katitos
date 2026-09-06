import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useGesture } from '@use-gesture/react';
import { Download, Share2, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { toast } from './toast';
import './photo-viewer.css';

const MAX_SCALE = 4;
/** px a horizontal flick must travel to turn the page. */
const PAGE_THRESHOLD = 56;
/** px a downward pull must travel to put the photo back down. */
const DISMISS_THRESHOLD = 110;

type Axis = 'x' | 'y' | null;

export interface ViewerPhoto {
  id: string;
  /** Small and already cached - what shows the instant it opens. */
  previewUrl?: string;
  /** Full resolution. Swapped in behind the preview once it lands. */
  fullUrl?: string;
  /** Small caps above the caption - a date, a month. */
  eyebrow?: ReactNode;
  caption?: ReactNode;
  /** Used for the downloaded file name. */
  fileName?: string;
}

/**
 * Full-screen lightbox - a photo held in the hand.
 *
 * Swipe left/right to leaf through, pull down (or tap) to put it back, pinch to
 * look closer. Download saves to Photos; Share opens the system sheet with the
 * full-resolution file.
 *
 * Lives in the kernel because more than one feature shows photos, and a second
 * hand-rolled lightbox would drift from this one immediately - the flowers were
 * opening in a bottom sheet with no zoom at all.
 *
 * Portaled to <body>: a route root carrying `.curtain-reveal` would otherwise
 * become the containing block for this `fixed` overlay and trap it inside the
 * 32rem column.
 */
export function PhotoViewer({
  photos,
  initialIndex,
  onClose,
}: {
  photos: ViewerPhoto[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);

  // Live gesture state. pageDx moves the whole strip; the rest shape the
  // active plate only (zoom / pan / pull-to-dismiss).
  const [pageDx, setPageDx] = useState(0);
  const [dismissDy, setDismissDy] = useState(0);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  /** Which ids have their full-resolution file decoded and ready. */
  const [ready, setReady] = useState<Record<string, boolean>>({});

  const axisRef = useRef<Axis>(null);
  const panStart = useRef({ x: 0, y: 0 });
  const plateRef = useRef<HTMLDivElement>(null);

  const current = photos[index];

  // Lock the page behind the immersive overlay; restore on close.
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // A fresh photo always starts un-zoomed and centred.
  useEffect(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    setPageDx(0);
    setDismissDy(0);
  }, [index]);

  // Fetch the original for the photo in hand (and its neighbours) behind the
  // preview, then swap. Opening a photo should never be a wait: the small one
  // is already in cache, and the real one arrives without a flash.
  useEffect(() => {
    const wanted = [index - 1, index, index + 1]
      .map((i) => photos[i])
      .filter((p): p is ViewerPhoto => !!p?.fullUrl && !ready[p.id]);
    if (wanted.length === 0) return;

    let cancelled = false;
    const imgs: HTMLImageElement[] = [];
    for (const photo of wanted) {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        if (!cancelled) setReady((r) => ({ ...r, [photo.id]: true }));
      };
      img.src = photo.fullUrl!;
      imgs.push(img);
    }
    return () => {
      cancelled = true;
      for (const img of imgs) img.src = '';
    };
    // `ready` is deliberately out: adding it would re-run on every load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, photos]);

  const clampPan = (p: { x: number; y: number }, s: number) => {
    const size = plateRef.current?.clientWidth ?? 0;
    const bound = (Math.max(0, s - 1) * size) / 2;
    return {
      x: Math.max(-bound, Math.min(bound, p.x)),
      y: Math.max(-bound, Math.min(bound, p.y)),
    };
  };

  const bind = useGesture(
    {
      onDrag: ({ active, first, last, movement: [mx, my], tap }) => {
        if (tap) {
          if (scale <= 1) onClose();
          return;
        }
        setDragging(active && !last);

        // Zoomed in → drag pans the photo instead of paging.
        if (scale > 1) {
          if (first) panStart.current = pan;
          const next = {
            x: panStart.current.x + mx,
            y: panStart.current.y + my,
          };
          setPan(last ? clampPan(next, scale) : next);
          return;
        }

        // Lock to the dominant axis once the finger commits to a direction.
        if (first) axisRef.current = null;
        if (!axisRef.current && (Math.abs(mx) > 8 || Math.abs(my) > 8)) {
          axisRef.current = Math.abs(my) > Math.abs(mx) ? 'y' : 'x';
        }

        if (axisRef.current === 'y') {
          setDismissDy(Math.max(0, my));
          if (last) {
            if (my > DISMISS_THRESHOLD) {
              onClose();
              return;
            }
            setDismissDy(0);
          }
        } else if (axisRef.current === 'x') {
          const atStart = index === 0;
          const atEnd = index === photos.length - 1;
          const resisted =
            (atStart && mx > 0) || (atEnd && mx < 0) ? mx / 3 : mx;
          setPageDx(resisted);
          if (last) {
            if (mx < -PAGE_THRESHOLD && !atEnd) setIndex((i) => i + 1);
            else if (mx > PAGE_THRESHOLD && !atStart) setIndex((i) => i - 1);
            setPageDx(0);
          }
        }

        if (last) axisRef.current = null;
      },
      onPinch: ({ offset: [s], last }) => {
        setDragging(!last);
        setScale(s);
        if (last) {
          if (s <= 1.02) {
            setScale(1);
            setPan({ x: 0, y: 0 });
          } else {
            setPan((p) => clampPan(p, s));
          }
        }
      },
    },
    {
      drag: { filterTaps: true, pointer: { touch: true } },
      pinch: { scaleBounds: { min: 1, max: MAX_SCALE }, rubberband: true },
    }
  );

  if (!current) return null;

  const backdropOpacity = Math.max(0.4, 0.93 - dismissDy / 520);
  const plateActiveTransform =
    scale !== 1 || pan.x || pan.y || dismissDy
      ? `translate(${pan.x}px, ${pan.y + dismissDy}px) scale(${scale})`
      : undefined;
  const slideTransition = dragging
    ? 'none'
    : 'transform 320ms var(--ease-settle)';

  const best = (p: ViewerPhoto) =>
    (ready[p.id] ? p.fullUrl : p.previewUrl) ?? p.fullUrl ?? p.previewUrl;

  const download = current.fullUrl ?? current.previewUrl;
  const fileName = current.fileName ?? `katitos-${current.id}.jpg`;

  const fetchFile = async (): Promise<File> => {
    const res = await fetch(download as string);
    const blob = await res.blob();
    return new File([blob], fileName, { type: blob.type || 'image/jpeg' });
  };

  const onDownload = async () => {
    if (!download) return;
    try {
      const file = await fetchFile();
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast.success('Saved to your photos 📸');
    } catch {
      // Last resort: open it so it can be long-pressed → Save Image.
      window.open(download, '_blank');
    }
  };

  const onShare = async () => {
    if (!download) return;
    try {
      const file = await fetchFile();
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Katitos' });
      } else {
        await onDownload();
      }
    } catch (e) {
      // The user dismissing the share sheet is not an error.
      if ((e as Error)?.name === 'AbortError') return;
      toast.error('Could not share that one');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[90] overflow-hidden">
      <div
        className="pv-backdrop-in absolute inset-0 bg-black"
        style={{ opacity: backdropOpacity }}
        aria-hidden="true"
      />

      <div
        {...bind()}
        className="absolute inset-0"
        style={{ touchAction: 'none' }}
      >
        {photos.map((p, i) => {
          if (Math.abs(i - index) > 1) return null;
          const active = i === index;
          const src = best(p);
          return (
            <div
              key={p.id}
              className="absolute inset-0 flex items-center justify-center px-6"
              style={{
                transform: `translateX(calc(${(i - index) * 100}% + ${pageDx}px))`,
                transition: slideTransition,
              }}
            >
              <figure
                ref={active ? plateRef : undefined}
                className="pv-plate-in m-0 w-full max-w-[min(92vw,30rem)]"
                style={{
                  transform: active ? plateActiveTransform : undefined,
                  transition:
                    active && !dragging
                      ? 'transform 280ms var(--ease-settle)'
                      : 'none',
                }}
              >
                <div className="marble gilt-hairline shadow-loge rounded-lg p-3 pb-4">
                  <div className="aspect-square w-full overflow-hidden rounded-md bg-brown">
                    {src && (
                      <img
                        src={src}
                        alt=""
                        decoding="async"
                        className={cn(
                          'h-full w-full object-cover',
                          // Only the small one gets the develop animation; the
                          // swap to full resolution must be invisible.
                          !ready[p.id] && 'polaroid-develop'
                        )}
                      />
                    )}
                  </div>
                  {(p.eyebrow || p.caption) && (
                    <figcaption className="mt-3 px-1 text-center">
                      {p.eyebrow && (
                        <span className="block font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-copper">
                          {p.eyebrow}
                        </span>
                      )}
                      {p.caption && (
                        <span className="mt-1 block font-display text-xl italic leading-snug text-brown">
                          {p.caption}
                        </span>
                      )}
                    </figcaption>
                  )}
                </div>
              </figure>
            </div>
          );
        })}
      </div>

      {/* Top chrome - close + position. */}
      <div className="pv-chrome-in pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition active:bg-white/20"
        >
          <X size={20} strokeWidth={2} />
        </button>
        {photos.length > 1 && (
          <span className="font-sans text-xs font-semibold tracking-[0.18em] text-white/70">
            {index + 1} / {photos.length}
          </span>
        )}
      </div>

      {/* Bottom chrome - save + share. */}
      <div className="pv-chrome-in pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => void onDownload()}
          disabled={!download}
          className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-full bg-white/10 px-6 font-sans text-sm font-semibold text-white backdrop-blur-md transition active:bg-white/20 disabled:opacity-40"
        >
          <Download size={18} /> Save
        </button>
        <button
          type="button"
          onClick={() => void onShare()}
          disabled={!download}
          className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 font-sans text-sm font-semibold text-accent-fg shadow-loge transition active:brightness-110 disabled:opacity-40"
        >
          <Share2 size={18} /> Share
        </button>
      </div>
    </div>,
    document.body
  );
}
