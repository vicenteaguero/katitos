import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '../lib/cn';

/**
 * The round control in the top bar - the wine "add" circle with its gilt
 * ring, or the quiet lifted one for settings and edit.
 *
 * Five screens each drew this from scratch, inline border and all. It is a
 * button, or a link when given `to`.
 */
export function TopBarButton({
  label,
  onClick,
  to,
  variant = 'accent',
  children,
  className,
}: {
  label: string;
  onClick?: () => void;
  to?: string;
  variant?: 'accent' | 'quiet';
  children: ReactNode;
  className?: string;
}) {
  const look = cn(
    'lift-press flex h-8 w-8 items-center justify-center rounded-full shadow-loge',
    variant === 'accent'
      ? 'bg-accent text-accent-fg'
      : 'bg-surface-2 text-gold',
    className
  );
  const ring = { border: '1px solid rgba(228,195,106,.4)' };
  if (to) {
    return (
      <Link
        to={to}
        aria-label={label}
        title={label}
        className={look}
        style={ring}
      >
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={look}
      style={ring}
    >
      {children}
    </button>
  );
}
