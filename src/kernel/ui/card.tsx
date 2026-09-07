import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export type CardTone = 'flat' | 'hairline' | 'hero' | 'tile';

const tones: Record<CardTone, string> = {
  // Separated by tone alone: the app's original card.
  flat: 'rounded-lg bg-surface p-4',
  // The faintest possible line, so surface-on-surface stops mushing.
  hairline: 'rounded-card border border-fg/[0.06] bg-surface p-3.5',
  // The one lit card on a screen: a wine wash and a gilt edge.
  hero: 'rounded-card border border-gold/[0.22] p-4',
  // A card inside a card.
  tile: 'rounded border border-fg/[0.08] bg-surface-2 p-3',
};

const HERO_WASH = 'linear-gradient(135deg, #2a0f1a, #1a0b13)';

export function Card({
  tone = 'flat',
  className,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: CardTone }) {
  return (
    <div
      className={cn(tones[tone], className)}
      style={tone === 'hero' ? { background: HERO_WASH, ...style } : style}
      {...props}
    />
  );
}

/**
 * Rows inside a card, one under the other with a hairline between: the
 * lessons of a unit, the words of a block. Rows lay themselves out; this
 * only draws the lines and drops the card's padding so rows can be full
 * width.
 */
export function CardRows({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('divide-y divide-fg/5 [&>*]:min-h-[56px]', className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'font-display text-2xl font-semibold tracking-tight text-fg',
        className
      )}
      {...props}
    />
  );
}
