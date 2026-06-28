import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '../lib/cn';

// A clearly-recessed field: a light hairline border + a darker inset fill so
// inputs stand out on BOTH the page (surface) and inside sheets/cards
// (surface-2) — they used to share surface-2 and vanish.
// `min-w-0 max-w-full` keeps native date/time inputs (which carry an intrinsic
// min-width) from overflowing a sheet/grid cell on iOS.
const base =
  'w-full min-w-0 max-w-full rounded-lg border border-[rgba(251,245,240,0.18)] bg-[rgba(0,0,0,0.28)] px-4 py-3 font-sans text-fg placeholder:text-muted shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] transition-colors duration-150 focus:border-[rgba(228,195,106,0.7)] focus:outline-none focus:ring-2 focus:ring-[rgba(228,195,106,0.28)]';

// Chevron so a <select> reads as a dropdown (appearance-none hides the native one).
const SELECT_CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23c9a24b' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(base, className)} {...props} />;
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 3, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(base, 'resize-none', className)}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, style, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(base, 'appearance-none bg-no-repeat pr-10', className)}
      style={{
        backgroundImage: SELECT_CHEVRON,
        backgroundPosition: 'right 1rem center',
        ...style,
      }}
      {...props}
    />
  );
});

export function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block space-y-2.5', className)}>
      {label && (
        <span className="block font-sans text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {label}
        </span>
      )}
      {children}
      {error ? (
        <span className="block font-sans text-xs text-danger">{error}</span>
      ) : (
        hint && (
          <span className="block font-sans text-xs text-muted">{hint}</span>
        )
      )}
    </label>
  );
}
