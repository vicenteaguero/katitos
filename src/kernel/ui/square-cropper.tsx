import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGesture } from '@use-gesture/react';
import { Check, X } from 'lucide-react';
import { decodeImage } from '../storage/image';
import { Button } from './button';
import { IconButton } from './icon-button';
import { Spinner } from './spinner';

/** Longest edge of the cropped output. Matches album/lib/downscale's cap. */
const OUT_MAX = 1600;
const MAX_ZOOM = 6;

export interface SquareCropperProps {
  /** The picked file (from FilePickerButton) or any image Blob. */
  file: Blob;
  /** Receives the cropped square as a JPEG Blob. */
  onCropped: (blob: Blob) => void;
  onCancel: () => void;
  /** Copy for the confirm button; defaults to "Use photo". */
  confirmLabel?: string;
  /** JPEG quality 0..1. */
  quality?: number;
}

/**
 * Pan-and-pinch square cropper.
 *
 * The app stores square photos (polaroids, flowers, wishlist items) but the
 * kernel camera only centre-crops what it shoots — there was no way to choose
 * the framing of a photo picked from the library. No cropping library is
 * installed and none is worth adding for this, so the maths is done by hand:
 * the image is laid out "cover" over a square window, the user moves it, and
 * the visible square is mapped back to source pixels for a single `drawImage`.
 *
 * Portaled to <body> so a route's `.curtain-reveal` transform can't become the
 * containing block for our fixed overlay (the same trap PolaroidViewer hits).
 */
export function SquareCropper({
  file,
  onCropped,
  onCancel,
  confirmLabel = 'Use photo',
  quality = 0.9,
}: SquareCropperProps) {
  const [img, setImg] = useState<{
    width: number;
    height: number;
    source: CanvasImageSource;
    url: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [side, setSide] = useState(0);

  // View state: zoom ≥ 1 (1 = exactly covering), and a centre-relative offset.
  const [view, setView] = useState({ zoom: 1, tx: 0, ty: 0 });
  const frameRef = useRef<HTMLDivElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Decode once; keep an object URL for the on-screen preview (drawing the
  // decoded source to a canvas every gesture frame would be needless work).
  useEffect(() => {
    let cancelled = false;
    let release: (() => void) | undefined;
    void (async () => {
      try {
        const decoded = await decodeImage(file);
        release = decoded.release;
        if (cancelled) {
          decoded.release();
          return;
        }
        const url = URL.createObjectURL(file);
        objectUrlRef.current = url;
        setImg({
          width: decoded.width,
          height: decoded.height,
          source: decoded.source,
          url,
        });
      } catch {
        if (!cancelled) setError("That photo couldn't be opened");
      }
    })();
    return () => {
      cancelled = true;
      release?.();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [file]);

  // Lock the page behind the overlay.
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, []);

  // Measure the square window (callback ref + observer — the mount-time read
  // lands mid `.curtain-reveal`, so a one-shot measurement is wrong).
  const setFrame = useCallback((el: HTMLDivElement | null) => {
    frameRef.current = el;
    if (!el) return;
    const measure = () => setSide(el.getBoundingClientRect().width);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // "Cover" scale: the smaller source edge exactly fills the window.
  const base = img && side ? side / Math.min(img.width, img.height) : 0;

  // Keep the image's edges outside the window — no empty corners, ever.
  const clamp = useCallback(
    (next: { zoom: number; tx: number; ty: number }) => {
      if (!img || !side) return next;
      const zoom = Math.min(MAX_ZOOM, Math.max(1, next.zoom));
      const k = (side / Math.min(img.width, img.height)) * zoom;
      const maxX = Math.max(0, (img.width * k - side) / 2);
      const maxY = Math.max(0, (img.height * k - side) / 2);
      return {
        zoom,
        tx: Math.max(-maxX, Math.min(maxX, next.tx)),
        ty: Math.max(-maxY, Math.min(maxY, next.ty)),
      };
    },
    [img, side]
  );

  const bind = useGesture(
    {
      onDrag: ({ offset: [ox, oy] }) =>
        setView((v) => clamp({ ...v, tx: ox, ty: oy })),
      // Re-clamp on zoom too: zooming OUT shrinks the pan bounds, which would
      // otherwise leave the image parked off-centre with a bare corner showing.
      onPinch: ({ offset: [s] }) => setView((v) => clamp({ ...v, zoom: s })),
    },
    {
      drag: { from: () => [view.tx, view.ty], filterTaps: true },
      pinch: {
        from: () => [view.zoom, 0],
        scaleBounds: { min: 1, max: MAX_ZOOM },
      },
    }
  );

  const confirm = async () => {
    if (!img || !side || busy) return;
    setBusy(true);
    try {
      const k = base * view.zoom;
      // The window shows a square of `side` view-px → `side / k` source-px.
      const srcSide = side / k;
      const cx = img.width / 2 - view.tx / k;
      const cy = img.height / 2 - view.ty / k;
      const sx = cx - srcSide / 2;
      const sy = cy - srcSide / 2;

      const out = Math.max(1, Math.min(OUT_MAX, Math.round(srcSide)));
      const canvas = document.createElement('canvas');
      canvas.width = out;
      canvas.height = out;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no 2d context');
      ctx.drawImage(img.source, sx, sy, srcSide, srcSide, 0, 0, out, out);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
      );
      if (!blob) throw new Error('encode failed');
      onCropped(blob);
    } catch {
      setError("That photo couldn't be cropped");
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[95] flex flex-col bg-black/95 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="flex shrink-0 items-center justify-between px-4">
        <IconButton label="Cancel" onClick={onCancel} className="text-white/80">
          <X className="h-5 w-5" />
        </IconButton>
        <span className="font-sans text-xs uppercase tracking-[0.18em] text-white/60">
          Drag &amp; pinch to frame
        </span>
        <span className="h-11 w-11" aria-hidden="true" />
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-5">
        {/* The square window. Everything outside it is cropped away. */}
        <div
          ref={setFrame}
          {...bind()}
          className="relative aspect-square w-full max-w-[26rem] overflow-hidden rounded-lg bg-black"
          style={{ touchAction: 'none' }}
        >
          {img ? (
            <img
              src={img.url}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
              style={{
                width: img.width * base,
                height: img.height * base,
                transform: `translate(-50%, -50%) translate(${view.tx}px, ${view.ty}px) scale(${view.zoom})`,
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              {error ? (
                <p className="px-6 text-center font-sans text-sm text-white/70">
                  {error}
                </p>
              ) : (
                <Spinner />
              )}
            </div>
          )}
          {/* A gilt hairline marking the crop edge — no heavy grid overlay. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-lg"
            style={{ boxShadow: 'inset 0 0 0 1px rgba(228,195,106,0.45)' }}
          />
        </div>
      </div>

      <div className="flex shrink-0 justify-center px-6 pt-5">
        <Button onClick={() => void confirm()} disabled={!img || busy}>
          <Check size={18} /> {busy ? 'Cropping…' : confirmLabel}
        </Button>
      </div>
    </div>,
    document.body
  );
}
