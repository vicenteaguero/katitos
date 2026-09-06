import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, RefreshCw, RotateCcw, X } from 'lucide-react';
import { acquireCamera, releaseCamera } from './camera-stream';
import { Button } from '../button';
import { IconButton } from '../icon-button';

type Facing = 'user' | 'environment';

export interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
  facingMode?: Facing;
  /** JPEG quality 0..1 */
  quality?: number;
  /**
   * Frame the preview as a white-bordered 1:1 square and centre-crop the saved
   * photo to match (the daily polaroid) - so what you shoot IS the polaroid.
   */
  square?: boolean;
}

/**
 * Full-screen in-app camera. Enforces capturing in-the-moment (no file picker).
 * Used by the daily polaroid and the Georgia scavenger proof.
 */
export function CameraCapture({
  onCapture,
  onCancel,
  facingMode = 'environment',
  quality = 0.9,
  square = false,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<Facing>(facingMode);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(
    null
  );

  // Hand the stream back to the shared holder rather than killing the tracks:
  // on iOS a fresh getUserMedia means another permission prompt, so stopping it
  // here is what made the app ask every single time the camera was opened.
  const stop = useCallback(() => {
    if (!streamRef.current) return;
    streamRef.current = null;
    releaseCamera();
  }, []);

  const attach = useCallback(async () => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      await videoRef.current.play().catch(() => {});
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera not supported on this device.');
      return;
    }
    try {
      // The shared holder keeps one stream alive for the whole session, so
      // this only prompts on the first camera of a launch.
      if (!streamRef.current) {
        streamRef.current = await acquireCamera(facing);
      }
      await attach();
    } catch {
      setError('Camera unavailable - check permissions.');
    }
  }, [facing, attach]);

  // Acquire on mount and whenever the camera (facing) changes; release for good
  // on unmount. Crucially NOT tied to `preview`, so a retake reuses the stream.
  useEffect(() => {
    let active = true;
    void (async () => {
      stop();
      if (active) await start();
    })();
    return () => {
      active = false;
    };
  }, [facing, start, stop]);

  useEffect(() => stop, [stop]);

  // After a retake the <video> remounts; re-point it at the still-live stream.
  useEffect(() => {
    if (!preview) void attach();
  }, [preview, attach]);

  // Front camera = a mirror: flip the live preview AND bake the flip into the
  // saved photo, so the picture matches what you saw (not the reversed world).
  const mirror = facing === 'user';

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    // Square mode centre-crops the source to 1:1 (matches the polaroid window).
    const side = Math.min(vw, vh);
    const sx = square ? (vw - side) / 2 : 0;
    const sy = square ? (vh - side) / 2 : 0;
    const cw = square ? side : vw;
    const ch = square ? side : vh;
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (mirror) {
      ctx.translate(cw, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, sx, sy, cw, ch, 0, 0, cw, ch);
    canvas.toBlob(
      (blob) => {
        // Keep the stream LIVE (no stop here) so retake doesn't re-prompt.
        if (blob) setPreview({ url: URL.createObjectURL(blob), blob });
      },
      'image/jpeg',
      quality
    );
  }, [quality, mirror, square]);

  const confirm = () => {
    if (!preview) return;
    URL.revokeObjectURL(preview.url);
    onCapture(preview.blob);
  };

  const retake = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const cancel = () => {
    stop();
    if (preview) URL.revokeObjectURL(preview.url);
    onCancel();
  };

  // Portal to <body> so the full-screen overlay escapes any transformed
  // ancestor (e.g. a `.curtain-reveal` route), which would otherwise trap a
  // position:fixed child into a small box instead of the whole viewport.
  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col bg-black">
      <div className="flex items-center justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <IconButton label="Cancel" onClick={cancel} className="text-white">
          <X />
        </IconButton>
        <span className="text-sm opacity-80">Take a photo</span>
        <IconButton
          label="Switch camera"
          onClick={() =>
            setFacing((f) => (f === 'user' ? 'environment' : 'user'))
          }
          disabled={!!preview}
          className="text-white"
        >
          <RefreshCw />
        </IconButton>
      </div>

      {square ? (
        // A white-bordered square - the polaroid window. What you see is what
        // you get, since the capture centre-crops to the same square.
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm rounded-md bg-white p-3 pb-12 shadow-loge">
            <div className="relative aspect-square w-full overflow-hidden rounded-sm bg-black">
              {preview ? (
                <img
                  src={preview.url}
                  alt="Captured preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                  style={mirror ? { transform: 'scaleX(-1)' } : undefined}
                />
              )}
              {error && (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white">
                  {error}
                </div>
              )}
            </div>
            <p className="mt-3 text-center font-display text-base italic text-brown/70">
              in the moment
            </p>
          </div>
        </div>
      ) : (
        <div className="relative flex-1 overflow-hidden">
          {preview ? (
            <img
              src={preview.url}
              alt="Captured preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
              style={mirror ? { transform: 'scaleX(-1)' } : undefined}
            />
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-white">
              {error}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-center gap-6 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {preview ? (
          <>
            <Button variant="secondary" onClick={retake}>
              <RotateCcw size={18} /> Retake
            </Button>
            <Button onClick={confirm}>
              <Check size={18} /> Use photo
            </Button>
          </>
        ) : (
          <button
            type="button"
            aria-label="Capture"
            onClick={capture}
            disabled={!!error}
            className="h-16 w-16 rounded-full border-4 border-white bg-white/20 transition active:scale-95 disabled:opacity-40"
          />
        )}
      </div>
    </div>,
    document.body
  );
}
