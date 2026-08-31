import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * A small pill: a chosen word, a tag, a filter.
 *
 * Tap to toggle when `onClick` is given; the × takes it away when `onRemove`
 * is. Selected is wine on white; quiet is a lifted panel.
 */
export function Chip({
  children,
  selected = false,
  onClick,
  onRemove,
  removeLabel = 'Remove',
  className,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  removeLabel?: string;
  className?: string;
}) {
  const look = cn(
    'inline-flex max-w-full items-center gap-1 rounded-full px-3 py-1 font-sans text-sm transition',
    selected ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-fg',
    onClick && 'lift-press hover:brightness-110',
    className
  );
  const body = <span className="min-w-0 truncate">{children}</span>;
  const remove = onRemove && (
    <button
      type="button"
      aria-label={removeLabel}
      onClick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
      className="-mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full opacity-70 hover:opacity-100"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={look}
      >
        {body}
        {remove}
      </button>
    );
  }
  return (
    <span className={look}>
      {body}
      {remove}
    </span>
  );
}

/** Chips, wrapping. */
export function ChipRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>{children}</div>
  );
}
