import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

/** Floating action button, pinned bottom-right above the nav bar. */
export function Fab({
  className,
  label,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-stage z-30 flex h-16 w-16 items-center justify-center overflow-hidden rounded-none velvet-2 gilt-hairline text-accent-fg shadow-loge outline-none transition lift-press btn-catchlight candle-flicker hover:brightness-110 focus-visible:shadow-candle',
        className
      )}
      {...props}
    />
  );
}
