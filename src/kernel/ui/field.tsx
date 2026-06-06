import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '../lib/cn';

const base =
  'w-full rounded border border-border bg-surface-2 px-3 py-2.5 text-fg placeholder:text-muted focus:border-accent focus:outline-none';

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
    <label className="block space-y-1.5">
      {label && (
        <span className="block text-sm font-medium text-muted">{label}</span>
      )}
      {children}
      {error ? (
        <span className="block text-xs text-danger">{error}</span>
      ) : (
        hint && <span className="block text-xs text-muted">{hint}</span>
      )}
    </label>
  );
}
