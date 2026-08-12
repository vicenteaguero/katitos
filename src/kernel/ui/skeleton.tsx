import type { CSSProperties } from 'react';
import { cn } from '../lib/cn';
import './skeleton.css';

/**
 * A loading plate the same shape as the thing that's coming.
 *
 * Prefer this over `<LoadingScreen>` on any screen where we already know the
 * layout: swapping a spinner for the real content reflows the page, while a
 * skeleton holds the space so nothing jumps. Give it the same aspect/rounding
 * as the real element.
 */
export function Skeleton({
  className,
  style,
  rounded = 'md',
}: {
  className?: string;
  style?: CSSProperties;
  /** Match the real element's corner radius. */
  rounded?: 'md' | 'lg' | 'xl' | 'full' | 'none';
}) {
  const radius = {
    none: 'rounded-none',
    md: 'rounded',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  }[rounded];

  return (
    <span
      aria-hidden="true"
      className={cn('kx-skeleton block', radius, className)}
      style={style}
    />
  );
}

/**
 * A paragraph's worth of skeleton lines. The last line is short, the way real
 * text ends mid-line — a block of equal-length bars reads as a table, not prose.
 */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <span className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className="h-3"
          style={{ width: i === lines - 1 ? '58%' : '100%' }}
        />
      ))}
    </span>
  );
}

/**
 * The whole screen's worth: a heading bar plus `rows` cards. The one-liner for
 * "this route is still loading" that keeps the page from collapsing to nothing.
 */
export function SkeletonList({
  rows = 3,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn('flex flex-col gap-3', className)}
    >
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} rounded="lg" className="h-20 w-full" />
      ))}
    </div>
  );
}
