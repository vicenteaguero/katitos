import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
}

/**
 * One of a few - a radio group that looks like a pill.
 *
 * A real radio group to the keyboard and to a screen reader: ONE tab stop,
 * ← → (and ↑ ↓) change the selection, Home/End jump to the ends, and the
 * selected segment says so with `aria-checked`, not only with its colour. It
 * used to be N unrelated buttons: N presses of Tab to get past it, and
 * nothing that announced which one was on.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  full = false,
  label,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  /** Stretch to fill the parent with equal-width segments (true 50/50…). */
  full?: boolean;
  /** What the group is, for a screen reader. */
  label?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );

  const pick = (i: number) => {
    const n = ((i % options.length) + options.length) % options.length;
    onChange(options[n].value);
    refs.current[n]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        pick(index + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        pick(index - 1);
        break;
      case 'Home':
        pick(0);
        break;
      case 'End':
        pick(options.length - 1);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        'rounded-full bg-surface-2 p-1',
        full ? 'flex w-full' : 'inline-flex',
        className
      )}
    >
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={i === index ? 0 : -1}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-full py-2 font-sans text-sm font-semibold tracking-[0.02em] outline-none transition lift-press focus-visible:ring-2 focus-visible:ring-gold',
            full ? 'flex-1 px-2 text-center' : 'px-5',
            o.value === value
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
