import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted border-border/40',
  accent: 'bg-accent/20 text-warning border-border/50',
  success: 'bg-success/20 text-warning border-success/60',
  warning: 'bg-warning/15 text-warning border-warning/50',
  danger: 'bg-danger/20 text-warning border-danger/60',
};

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-none border px-2.5 py-1 font-sans text-xs font-semibold uppercase tracking-[0.08em]',
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
