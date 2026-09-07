import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

type Variant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'quiet'
  | 'outline'
  | 'danger'
  | 'destructive'
  | 'affirm'
  | 'warn';
type Size = 'xs' | 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  // Wine red, WHITE text, no border - the one true action.
  primary: 'bg-accent text-accent-fg lift-press hover:brightness-110',
  // Quiet lifted panel with the faintest line, so it reads on any ground.
  secondary:
    'bg-surface-2 text-fg border border-fg/[0.08] lift-press hover:brightness-110',
  // Bare copy that warms into a panel on touch.
  ghost:
    'bg-transparent text-fg lift-press hover:bg-surface-2 active:bg-surface-2',
  // Bare gold copy: "Practise these", "Done", "Undo".
  quiet: 'bg-transparent text-gold lift-press hover:bg-fg/5',
  // Gold on a gold line: "Reveal answer", "Answer", "+ Insert here".
  outline:
    'bg-transparent text-gold border border-gold/25 lift-press hover:bg-gold/5',
  // Error red, white text, no border: the solid one.
  danger: 'bg-danger text-accent-fg lift-press hover:brightness-110',
  // The tinted three: a verdict, a grade, a put-away.
  destructive:
    'bg-danger/[0.14] text-[#e0919b] border border-danger/35 lift-press hover:bg-danger/20',
  affirm:
    'bg-success/[0.16] text-[#a9b37e] border border-success/40 lift-press hover:bg-success/25',
  warn: 'bg-warning/10 text-warning border border-warning/30 lift-press hover:bg-warning/15',
};

// xs is the compact control inside a card or rail; sm the smallest touch
// target; md the footer button; lg the one big thing on a screen.
const sizes: Record<Size, string> = {
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
