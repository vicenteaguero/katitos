import { CameraCapture, type CameraCaptureProps } from '@kernel/ui';

/**
 * Polaroid-framed wrapper around the kernel CameraCapture.
 *
 * The kernel component owns the camera/getUserMedia/preview/confirm flow and is
 * left untouched. Here we only dress it: a thick cream instant-photo border with
 * the classic taller bottom "chin" and a square photo window. The live preview
 * (and the captured shot) sit inside that window, so taking the photo *looks*
 * like a Polaroid. Square corners, white-gold hairline, flat — a modern app, not
 * a theatre floor.
 *
 * Layout note: CameraCapture renders `fixed inset-0`. We scope it under
 * `.polaroid-frame` and re-flow that fixed child to fill our square window via
 * the scoped rules in index.css, then lay the cream frame on top.
 */
export function PolaroidCamera(props: CameraCaptureProps) {
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* The instant-photo body: cream stock, square window, taller chin. */}
      <figure className="polaroid-frame relative m-0 flex w-full max-w-sm flex-col bg-fg p-3 pb-16 shadow-2xl">
        {/* Square photo window — the kernel camera reflows to fill this. */}
        <div className="relative aspect-square w-full overflow-hidden bg-black">
          <CameraCapture {...props} />
        </div>
        {/* The chin — where a real polaroid leaves room for a caption. */}
        <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex h-14 items-center justify-center">
          <span className="font-display text-base italic tracking-tight text-brown/70">
            in the moment
          </span>
        </figcaption>
      </figure>
    </div>
  );
}
