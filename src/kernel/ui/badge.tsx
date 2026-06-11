import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted',
  accent: 'bg-accent/25 text-fg',
  success: 'bg-success/25 text-fg',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/25 text-fg',
};

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2.5 py-1 font-sans text-xs font-semibold uppercase tracking-[0.08em]',
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
