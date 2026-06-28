import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, RefreshCw, RotateCcw, X } from 'lucide-react';
import { Button } from '../button';
import { IconButton } from '../icon-button';

type Facing = 'user' | 'environment';

export interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onCancel: () => void;
  facingMode?: Facing;
  /** JPEG quality 0..1 */
  quality?: number;
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
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<Facing>(facingMode);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(
    null
  );

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
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
      // Reuse the live stream if we already have one. iOS PWAs re-prompt on
      // every fresh getUserMedia, so we acquire ONCE and keep it alive across
      // capture/retake — only switching cameras (facing) gets a new stream.
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        });
      }
      await attach();
    } catch {
      setError('Camera unavailable — check permissions.');
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
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (mirror) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        // Keep the stream LIVE (no stop here) so retake doesn't re-prompt.
        if (blob) setPreview({ url: URL.createObjectURL(blob), blob });
      },
      'image/jpeg',
      quality
    );
  }, [quality, mirror]);

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

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black">
      <div className="flex items-center justify-between p-3 text-white">
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
    </div>
  );
}
