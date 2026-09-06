import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../lib/cn';

/**
 * A photo sitting on instant-film stock: square window, wide chin, caption
 * printed on the chin.
 *
 * The daily photo, the flowers and the album all show the same object, so the
 * proportions live here instead of being re-guessed each time - that is how
 * the flowers ended up with a square frame that cropped its own caption.
 *
 * The square window is the important part: it must stay square at every size,
 * and the chin below it must be taller than the other three edges, or it stops
 * reading as a polaroid.
 */
export function PolaroidPlate({
  children,
  caption,
  captionTone = 'label',
  size = 'md',
  tilt,
  className,
  style,
  onClick,
  label,
}: {
  /** The image (or placeholder) that fills the square window. */
  children: ReactNode;
  /** Printed on the chin - a date, a month, a name. */
  caption?: ReactNode;
  /**
   * How the chin reads. `label` is a date or a month: small, spaced, copper.
   * `note` is something one of us actually wrote, so it keeps the handwritten
   * italic - a caption set in tracked uppercase stops sounding like a person.
   */
  captionTone?: 'label' | 'note';
  /** `md` full width, `sm` for a three-across row. */
  size?: 'sm' | 'md';
  /** Degrees of rest tilt, for photos dropped on a table. */
  tilt?: number;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  label?: string;
}) {
  const pad = size === 'sm' ? 'p-1.5 pb-2.5' : 'p-3 pb-5';
  const gap = size === 'sm' ? 'mt-1.5' : 'mt-3.5';
  const type =
    captionTone === 'note'
      ? size === 'sm'
        ? 'font-display text-sm italic text-brown'
        : 'font-display text-lg italic leading-snug text-brown'
      : size === 'sm'
        ? 'font-sans text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-copper'
        : 'font-sans text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-copper';

  const body = (
    <>
      {/* Always square, whatever the plate's width. */}
      {/* Unexposed film, not a dark hole: whatever shows at the photo's
          rounded corners has to read as part of the plate. */}
      <span className="block aspect-square w-full overflow-hidden rounded-sm bg-[#e3d8c6]">
        {children}
      </span>
      {caption != null && (
        <span className={cn('block truncate px-0.5 text-center', gap, type)}>
          {caption}
        </span>
      )}
    </>
  );

  const shell = cn(
    'marble shadow-loge block w-full rounded-md',
    pad,
    onClick && 'lift-press',
    className
  );
  const merged: CSSProperties = {
    ...(tilt ? { transform: `rotate(${tilt}deg)` } : null),
    ...style,
  };

  if (!onClick) {
    return (
      <div className={shell} style={merged}>
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={shell}
      style={merged}
    >
      {body}
    </button>
  );
}
