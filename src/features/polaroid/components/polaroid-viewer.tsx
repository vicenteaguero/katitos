import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGesture } from '@use-gesture/react';
import { Download, Share2, X } from 'lucide-react';
import { DateTime } from 'luxon';
import { BUCKETS, useProxiedUrl } from '@kernel/storage';
import { toast } from '@kernel/ui';
import type { Polaroid } from '../types';
import { PolaroidImage } from './polaroid-image';
import '../polaroid.css';

const MAX_SCALE = 4;
/** px a horizontal flick must travel to turn the page. */
const PAGE_THRESHOLD = 56;
/** px a downward pull must travel to drop the photo back on the wall. */
const DISMISS_THRESHOLD = 110;

type Axis = 'x' | 'y' | null;

/**
 * Full-screen lightbox — the day's instant photo held in the hand. Swipe left/
 * right to leaf through the album, pull down (or tap) to set it back on the
 * wall, pinch to look closer. Download saves to Photos; Share opens the system
 * sheet (Telegram, WhatsApp, …) with the full-resolution file.
 *
 * Portaled to <body>: the route root carries a `.curtain-reveal` transform that
 * would otherwise become the containing block for our `fixed` overlay, trapping
 * it inside the 32rem column. The portal restores true viewport fixing.
 */
export function PolaroidViewer({
  photos,
  initialIndex,
  onClose,
}: {
  photos: Polaroid[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);

  // Live gesture state. pageDx moves the whole strip; the rest shape the active
  // plate only (zoom / pan / pull-to-dismiss).
  const [pageDx, setPageDx] = useState(0);
  const [dismissDy, setDismissDy] = useState(0);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const axisRef = useRef<Axis>(null);
  const panStart = useRef({ x: 0, y: 0 });
  const plateRef = useRef<HTMLElement>(null);

  const current = photos[index];
  const { fullUrl } = useProxiedUrl(BUCKETS.polaroids, current?.image_path);

  // Lock the page behind the immersive overlay; restore on close.
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, []);

  // Escape closes (desktop / external keyboard).
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

  // How far a zoomed photo may be panned before its edge would pull inward.
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
          // Resist swiping past either end of the album.
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

  const fileName = `polaroid-${current.day}.jpg`;
  const shareText = current.caption ?? '';

  const fetchFile = async (): Promise<File> => {
    const res = await fetch(fullUrl as string);
    const blob = await res.blob();
    return new File([blob], fileName, { type: 'image/jpeg' });
  };

  const onDownload = async () => {
    if (!fullUrl) return;
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
      // Last resort: open the original so it can be long-pressed → Save Image.
      window.open(fullUrl, '_blank');
    }
  };

  const onShare = async () => {
    if (!fullUrl) return;
    try {
      const file = await fetchFile();
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Our polaroid',
          text: shareText,
        });
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
        className="viewer-backdrop-in absolute inset-0 bg-black"
        style={{ opacity: backdropOpacity }}
        aria-hidden="true"
      />

      {/* The album strip. Bound to the gesture; tapping the photo closes. */}
      <div
        {...bind()}
        className="absolute inset-0"
        style={{ touchAction: 'none' }}
      >
        {photos.map((p, i) => {
          if (Math.abs(i - index) > 1) return null;
          const active = i === index;
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
                className="viewer-plate-in m-0 w-full max-w-[min(92vw,30rem)]"
                style={{
                  transform: active ? plateActiveTransform : undefined,
                  transition:
                    active && !dragging
                      ? 'transform 280ms var(--ease-settle)'
                      : 'none',
                }}
              >
                <div className="marble gilt-hairline shadow-loge rounded-lg p-3 pb-4">
                  <div className="aspect-square w-full overflow-hidden rounded-none bg-brown">
                    <PolaroidImage
                      path={p.image_path}
                      full
                      className="h-full w-full"
                    />
                  </div>
                  <figcaption className="mt-3 px-1 text-center">
                    <span className="block font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-copper">
                      {DateTime.fromISO(p.day).toFormat('cccc, LLL d')}
                    </span>
                    {p.caption && (
                      <span className="mt-1 block font-display text-xl italic leading-snug text-brown">
                        {p.caption}
                      </span>
                    )}
                  </figcaption>
                </div>
              </figure>
            </div>
          );
        })}
      </div>

      {/* Top chrome — close + position. pointer-events pass through the gaps so
          tapping anywhere but a control still closes. */}
      <div className="viewer-chrome-in pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
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

      {/* Bottom chrome — save + share. */}
      <div className="viewer-chrome-in pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onDownload}
          disabled={!fullUrl}
          className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-full bg-white/10 px-6 font-sans text-sm font-semibold text-white backdrop-blur-md transition active:bg-white/20 disabled:opacity-40"
        >
          <Download size={18} /> Save
        </button>
        <button
          type="button"
          onClick={onShare}
          disabled={!fullUrl}
          className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 font-sans text-sm font-semibold text-accent-fg shadow-loge transition active:brightness-110 disabled:opacity-40"
        >
          <Share2 size={18} /> Share
        </button>
      </div>
    </div>,
    document.body
  );
}
