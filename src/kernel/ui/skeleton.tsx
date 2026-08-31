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
