import { useRef, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface FilePickerButtonProps {
  /** Receives the chosen image as a Blob (a File is a Blob). */
  onPick?: (file: File) => void;
  /**
   * Receives EVERY chosen file. Set this (with `multiple`) for a bulk pick -
   * filling an album a page at a time is not a thing anyone will do twice.
   */
  onPickMany?: (files: File[]) => void;
  /** Allow choosing more than one file. Requires `onPickMany`. */
  multiple?: boolean;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  /** MIME accept filter; defaults to any image. */
  accept?: string;
  /** Drop all built-in styling - the caller supplies the whole appearance. */
  bare?: boolean;
  /**
   * Ask for the phone's own camera instead of its photo library.
   *
   * This is how the daily polaroid is taken now. `getUserMedia` re-asks for
   * permission on every cold launch of an installed PWA on iOS - there is no
   * setting and no API that stops it - so the one camera you use every single
   * day uses the system camera, which asks nothing. 'user' is the front lens.
   */
  capture?: 'user' | 'environment';
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
  onPickMany,
  multiple = false,
  children,
  className,
  disabled,
  accept = 'image/*',
  bare = false,
  capture,
}: FilePickerButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={cn(
          // `bare` hands the whole appearance to the caller - used where the
          // picker IS the thing you tap (a polaroid slot), not a button beside
          // it. `cn` only joins classes, so a caller cannot reliably override
          // ours; opting out is the honest way to do this.
          bare
            ? 'lift-press block w-full disabled:opacity-50'
            : // Otherwise: the same quiet lifted panel as Button's `secondary`.
              // Separated by tone, never by a line - this was the one kernel
              // control with a literal border, so it never matched its
              // neighbours.
              'lift-press inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-surface-2 px-6 font-sans text-sm font-semibold text-fg transition hover:brightness-110 disabled:opacity-50',
          className
        )}
      >
        {children}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        capture={capture}
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) {
            if (onPickMany) onPickMany(files);
            else onPick?.(files[0]);
          }
          // reset so picking the same file again still fires onChange
          e.target.value = '';
        }}
      />
    </>
  );
}
