import { useEffect } from 'react';
import { CameraCapture, type CameraCaptureProps } from '@kernel/ui';

/**
 * The daily polaroid camera — the kernel camera in `square` mode: a white,
 * 1:1 polaroid window with an "in the moment" chin, and the saved shot
 * centre-cropped to that same square so the photo IS the polaroid. (The kernel
 * camera owns the full-screen overlay + getUserMedia flow.)
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

  return <CameraCapture square {...props} />;
}
