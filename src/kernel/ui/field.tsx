import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '../lib/cn';

const base =
  'w-full rounded bg-surface-2 px-4 py-3 font-sans text-fg placeholder:text-muted transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-gold/25';

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
>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(base, 'appearance-none', className)}
      {...props}
    />
  );
});

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2.5">
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
