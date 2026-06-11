import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  // Velvet curtain with a gilt-leaf hairline edge; press-lifts and catches the light.
  primary:
    'velvet-2 gilt-hairline text-accent-fg shadow-catch lift-press btn-catchlight hover:brightness-110',
  // Lifted loge panel framed in flat gilt; brightens like leaf under a candle.
  secondary:
    'velvet-2 gilt-hairline-flat text-fg shadow-catch lift-press hover:brightness-110',
  // Bare program copy that warms into a velvet box on touch.
  ghost:
    'bg-transparent text-fg lift-press hover:bg-surface-2 active:bg-surface-2',
  // Fabergé lacquer red, framed and lifted.
  danger:
    'bg-danger gilt-hairline-flat text-accent-fg shadow-catch lift-press btn-catchlight hover:brightness-110',
};

const sizes: Record<Size, string> = {
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
          'relative isolate inline-flex select-none items-center justify-center gap-2 overflow-hidden rounded-none font-sans font-semibold tracking-[0.02em] outline-none transition focus-visible:shadow-candle disabled:pointer-events-none disabled:opacity-50',
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
