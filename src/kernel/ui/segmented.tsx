import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  full = false,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  /** Stretch to fill the parent with equal-width segments (true 50/50…). */
  full?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-full bg-surface-2 p-1',
        full ? 'flex w-full' : 'inline-flex',
        className
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-full py-2 font-sans text-sm font-semibold tracking-[0.02em] outline-none transition lift-press focus-visible:ring-2 focus-visible:ring-gold',
            full ? 'flex-1 px-2 text-center' : 'px-5',
            value === o.value
              ? 'bg-accent text-accent-fg'
              : 'text-muted hover:text-fg'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
