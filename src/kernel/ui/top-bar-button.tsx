import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '../lib/cn';

/**
 * The round control in the top bar - the wine "add" circle with its gilt
 * ring, or the quiet lifted one for settings and edit.
 *
 * Five screens each drew this from scratch, inline border and all. It is a
 * button, or a link when given `to`. 40px of it is visible; the target is
 * 44px, the extra ring drawn invisibly around it.
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
    'lift-press relative flex h-10 w-10 items-center justify-center rounded-full shadow-loge outline-none before:absolute before:-inset-0.5 before:content-[""] focus-visible:ring-2 focus-visible:ring-gold',
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

/**
 * A worded control in the top bar: "Edit", "Done", "Teach", "Select".
 *
 * The one action a screen gets (the other end of the bar is the back
 * button). `label` is the full accessible name; `children` is the short
 * word that fits. `quiet` is the resting look, `accent` the "on" look, so
 * Edit becomes Done by switching tone.
 */
export function TopBarPill({
  label,
  onClick,
  to,
  tone = 'quiet',
  icon,
  children,
  className,
}: {
  label: string;
  onClick?: () => void;
  to?: string;
  tone?: 'accent' | 'quiet';
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const look = cn(
    'lift-press inline-flex h-10 shrink-0 items-center gap-1.5 rounded px-3.5 font-sans text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-gold',
    tone === 'accent'
      ? 'bg-accent text-accent-fg border border-gold/25'
      : 'bg-surface-2 text-gold border border-gold/25',
    className
  );
  const body = (
    <>
      {icon}
      {children}
    </>
  );
  if (to) {
    return (
      <Link to={to} aria-label={label} title={label} className={look}>
        {body}
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
    >
      {body}
    </button>
  );
}
