import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ className, label, type = 'button', ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex h-11 w-11 items-center justify-center rounded text-fg outline-none transition lift-press hover:bg-surface-2 active:bg-surface-2 focus-visible:ring-2 focus-visible:ring-gold/30 disabled:opacity-50',
          className
        )}
        {...props}
      />
    );
  }
);
