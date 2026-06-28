import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CameraCapture, type CameraCaptureProps } from '@kernel/ui';

/**
 * Polaroid-framed wrapper around the kernel CameraCapture.
 *
 * The kernel component owns the camera/getUserMedia/preview/confirm flow and is
 * left untouched. Here we only dress it: a cream instant-photo body with the
 * classic taller bottom "chin" and a square (radius 0) photo window. The live
 * preview (and the captured shot) sit inside that window with object-cover, so
 * taking the photo *looks* like a Polaroid — no letterbox gaps.
 *
 * Layout notes:
 * - Rendered through a PORTAL to <body>. The route root animates with
 *   `.curtain-reveal`, whose persisting transform would otherwise become the
 *   containing block for our `fixed` overlay — trapping it inside the 32rem
 *   column (black margins, scrollable). The portal restores true viewport
 *   fixing: an immersive 100dvh overlay, no scroll.
 * - CameraCapture renders `fixed inset-0`. We scope it under `.polaroid-frame`
 *   and re-flow that fixed child via the rules in index.css: the preview fills
 *   our square window; the cancel/switch header and the shutter / retake-use
 *   bar are pinned to the viewport top and bottom edges.
 */
export function PolaroidCamera(props: CameraCaptureProps) {
  // Lock the page behind the immersive overlay while it is open.
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex h-dvh flex-col items-center justify-center overflow-hidden overscroll-contain bg-black px-6 py-20">
      {/* The instant-photo body: cream stock, square window, taller chin. */}
      <figure className="polaroid-frame relative m-0 flex w-full max-w-sm flex-col bg-fg p-3 pb-16 shadow-loge">
        {/* Square photo window — the kernel camera reflows to fill this. */}
        <div className="relative aspect-square w-full overflow-hidden rounded-md bg-black">
          <CameraCapture {...props} />
        </div>
        {/* The chin — where a real polaroid leaves room for a caption. */}
        <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex h-14 items-center justify-center">
          <span className="font-display text-base italic tracking-tight text-brown/70">
            in the moment
          </span>
        </figcaption>
      </figure>
    </div>,
    document.body
  );
}
