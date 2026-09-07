import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@kernel/lib';

const cols = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
} as const;

/**
 * A fixed grid of tiles: the two tools on the language home, the four
 * columns of the alphabet, the six things you can insert in a lesson. Fixed
 * so nothing wraps into a ragged row when a label runs long.
 */
export function ActionGrid({
  cols: n,
  children,
  className,
  ...props
}: { cols: 2 | 3 | 4 | 5; children: ReactNode; className?: string } & Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'className'
>) {
  return (
    <div className={cn('grid gap-2', cols[n], className)} {...props}>
      {children}
    </div>
  );
}

/**
 * One tile. `row` puts the icon in a gold square beside the label (the home
 * tools); without it the icon sits over the label (an insert menu, a kind
 * picker). `selected` fills it wine.
 */
export function ActionTile({
  icon,
  label,
  note,
  to,
  onClick,
  selected = false,
  row = false,
  className,
  ...props
}: {
  icon?: ReactNode;
  label: ReactNode;
  note?: ReactNode;
  to?: string;
  onClick?: () => void;
  selected?: boolean;
  row?: boolean;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'className'>) {
  const look = cn(
    'lift-press flex min-h-[52px] rounded-card border font-sans outline-none transition focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50',
    row
      ? 'items-center gap-2.5 px-3.5 py-2.5 text-left'
      : 'flex-col items-center justify-center gap-1.5 px-1 py-3 text-center',
    selected
      ? 'border-gold/35 bg-accent text-accent-fg'
      : 'border-fg/[0.06] bg-surface text-fg',
    className
  );
  const body = (
    <>
      {icon && (
        <span
          className={cn(
            'flex shrink-0 items-center justify-center',
            row && 'h-9 w-9 rounded-[10px] bg-surface-2',
            selected ? 'text-accent-fg' : 'text-gold'
          )}
        >
          {icon}
        </span>
      )}
      <span className={cn('min-w-0', row ? 'flex-1' : 'block')}>
        <span
          className={cn(
            'block truncate font-bold',
            row ? 'text-sm' : 'text-[11px]'
          )}
        >
          {label}
        </span>
        {note && (
          <span
            className={cn(
              'block truncate font-semibold',
              row ? 'text-xs' : 'text-[10px]',
              selected ? 'text-accent-fg/80' : 'text-muted'
            )}
          >
            {note}
          </span>
        )}
      </span>
    </>
  );
  if (to) {
    return (
      <Link to={to} className={look}>
        {body}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected || undefined}
      className={look}
      {...props}
    >
      {body}
    </button>
  );
}
