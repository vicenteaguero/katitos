import { cn } from '../lib/cn';
import { Kicker } from './kicker';

/** A number with its caption under it — "12 · known", "80%". */
export function StatPill({
  value,
  label,
  tone = 'gold',
  align = 'right',
  className,
}: {
  value: string | number;
  label: string;
  tone?: 'gold' | 'fg';
  align?: 'left' | 'center' | 'right';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'shrink-0',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
    >
      <span
        className={cn(
          'block font-display text-xl font-semibold tabular-nums',
          tone === 'gold' ? 'text-gold' : 'text-fg'
        )}
      >
        {value}
      </span>
      <Kicker as="span" tone="muted" className="block">
        {label}
      </Kicker>
    </span>
  );
}
