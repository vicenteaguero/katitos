import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'xs' | 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  // Wine red, WHITE text, no border — the one true action.
  primary: 'bg-accent text-accent-fg lift-press hover:brightness-110',
  // Quiet lifted panel — separated by tone, never by a line.
  secondary: 'bg-surface-2 text-fg lift-press hover:brightness-110',
  // Bare copy that warms into a panel on touch.
  ghost:
    'bg-transparent text-fg lift-press hover:bg-surface-2 active:bg-surface-2',
  // Error red, white text, no border.
  danger: 'bg-danger text-accent-fg lift-press hover:brightness-110',
};

const sizes: Record<Size, string> = {
  // Dense forms on a desk: a 48px button per option row was a wall.
  xs: 'h-9 px-3.5 text-sm',
  sm: 'h-11 px-5 text-sm',
  md: 'h-12 px-6',
  lg: 'h-14 px-8 text-lg',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = 'primary',
      size = 'md',
      full,
      type = 'button',
      ...props
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'relative isolate inline-flex select-none items-center justify-center gap-2 overflow-hidden rounded font-sans font-semibold tracking-[0.02em] outline-none transition focus-visible:ring-2 focus-visible:ring-gold disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          full && 'w-full',
          className
        )}
        {...props}
      />
    );
  }
);
