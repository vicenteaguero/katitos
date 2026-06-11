import { cn } from '@kernel/lib';

const VALUES = [1, 2, 3, 4, 5] as const;

/** Interactive 1–5 star selector — gilt points struck on the card. */
export function Stars({
  value,
  onChange,
  disabled,
  className,
}: {
  value: number | null;
  onChange: (stars: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex gap-1.5', className)}>
      {VALUES.map((n) => {
        const active = value != null && n <= value;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            aria-pressed={value === n}
            onClick={() => onChange(n)}
            className={cn(
              'rounded-none text-3xl leading-none outline-none transition active:scale-90 disabled:opacity-50',
              active
                ? 'gilt-text candle-flicker drop-shadow-[0_0_6px_rgba(201,162,75,0.35)]'
                : 'text-border/45 hover:text-border'
            )}
          >
            {active ? '★' : '☆'}
          </button>
        );
      })}
    </div>
  );
}

/** Read-only star display — the card's struck score, gilt points + a tally. */
export function StarsDisplay({
  value,
  className,
}: {
  value: number | null;
  className?: string;
}) {
  const rounded = value == null ? 0 : Math.round(value);
  return (
    <span
      className={cn('inline-flex items-center gap-2', className)}
      aria-label={value == null ? 'No rating' : `${value} of 5 stars`}
    >
      <span
        aria-hidden
        className="gilt-text text-base leading-none tracking-[0.12em]"
      >
        {VALUES.map((n) => (n <= rounded ? '★' : '☆')).join('')}
      </span>
      {value != null && (
        <span className="font-sans text-xs font-semibold tabular-nums text-muted">
          {value.toFixed(1)}
        </span>
      )}
    </span>
  );
}
