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
        'fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-stage z-30 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-accent text-accent-fg shadow-loge outline-none transition lift-press hover:brightness-110 focus-visible:ring-2 focus-visible:ring-gold/30',
        className
      )}
      {...props}
    />
  );
}
