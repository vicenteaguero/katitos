import { useRef, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface FilePickerButtonProps {
  /** Receives the chosen image as a Blob (a File is a Blob). */
  onPick: (file: File) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  /** MIME accept filter; defaults to any image. */
  accept?: string;
}

/**
 * A thin bridge over a hidden `<input type="file">`. The kernel `CameraCapture`
 * is getUserMedia-only (no library access), so this covers "upload an existing
 * photo". The picked File feeds the same upload/downscale pipeline as a camera
 * Blob. iOS converts HEIC on pick in most versions; the downscale step
 * re-encodes to JPEG as a safety net.
 */
export function FilePickerButton({
  onPick,
  children,
  className,
  disabled,
  accept = 'image/*',
}: FilePickerButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-2 px-4 py-2 text-fg transition active:opacity-80 disabled:opacity-50',
          className
        )}
      >
        {children}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          // reset so picking the same file again still fires onChange
          e.target.value = '';
        }}
      />
    </>
  );
}
