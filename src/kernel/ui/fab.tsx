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
        'fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-lg transition active:opacity-90',
        className
      )}
      {...props}
    />
  );
}
