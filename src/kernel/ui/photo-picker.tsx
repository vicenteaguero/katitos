import { useEffect, useState } from 'react';
import { Camera, ImagePlus, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { FilePickerButton } from './file-picker-button';
import { CameraCapture } from './camera/camera-capture';
import { SquareCropper } from './square-cropper';

/**
 * "Add a picture" — pick one, frame it, done.
 *
 * Every screen that attaches a photo was wiring the same three pieces together
 * by hand (file picker → cropper → preview), each slightly differently. This is
 * that flow, once: a thumbnail of what you chose, and one control to change it.
 */
export function PhotoPicker({
  value,
  onChange,
  /** Show a camera option alongside the library. */
  camera = false,
  /** A photo already stored, shown when nothing new has been picked. */
  currentUrl,
  className,
}: {
  value: Blob | null;
  onChange: (blob: Blob | null) => void;
  camera?: boolean;
  currentUrl?: string;
  className?: string;
}) {
  const [cropping, setCropping] = useState<Blob | null>(null);
  const [shooting, setShooting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const shown = preview ?? currentUrl ?? null;

  return (
    <>
      <div className={cn('flex items-center gap-3', className)}>
        {shown ? (
          <span className="relative shrink-0">
            <img
              src={shown}
              alt=""
              className="h-16 w-16 rounded-lg object-cover"
            />
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label="Remove picture"
              className="lift-press absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface-2 text-muted shadow-catch"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ) : null}

        <FilePickerButton
          onPick={(file) => setCropping(file)}
          className="flex-1 justify-center"
        >
          <ImagePlus className="h-4 w-4" />
          {shown ? 'Change picture' : 'Add a picture'}
        </FilePickerButton>

        {camera && (
          <button
            type="button"
            onClick={() => setShooting(true)}
            aria-label="Take a photo"
            className="lift-press flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-gold"
          >
            <Camera className="h-4 w-4" />
          </button>
        )}
      </div>

      {cropping && (
        <SquareCropper
          file={cropping}
          confirmLabel="Use this"
          onCancel={() => setCropping(null)}
          onCropped={(blob) => {
            onChange(blob);
            setCropping(null);
          }}
        />
      )}

      {shooting && (
        <CameraCapture
          square
          facingMode="environment"
          onCapture={(blob) => {
            setShooting(false);
            onChange(blob);
          }}
          onCancel={() => setShooting(false)}
        />
      )}
    </>
  );
}
