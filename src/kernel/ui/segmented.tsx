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
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex gilt-hairline-flat rounded-none velvet-2 p-1 shadow-catch',
        className
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-none px-5 py-2 font-sans text-sm font-semibold tracking-[0.02em] outline-none transition lift-press focus-visible:shadow-candle',
            value === o.value
              ? 'bg-accent text-accent-fg shadow-catch'
              : 'text-muted hover:text-fg'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
