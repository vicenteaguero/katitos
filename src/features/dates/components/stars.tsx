import { cn } from '@kernel/lib';

const VALUES = [1, 2, 3, 4, 5] as const;

/** Interactive 1–5 star selector. */
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
    <div className={cn('inline-flex gap-1', className)}>
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
              'text-2xl leading-none transition active:scale-95 disabled:opacity-50',
              active ? 'text-warning' : 'text-border'
            )}
          >
            {active ? '★' : '☆'}
          </button>
        );
      })}
    </div>
  );
}

/** Read-only star display (supports halves via rounding). */
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
      className={cn('inline-flex items-center gap-1 text-warning', className)}
      aria-label={value == null ? 'No rating' : `${value} of 5 stars`}
    >
      <span aria-hidden className="text-base leading-none">
        {VALUES.map((n) => (n <= rounded ? '★' : '☆')).join('')}
      </span>
      {value != null && (
        <span className="text-xs font-medium text-muted">
          {value.toFixed(1)}
        </span>
      )}
    </span>
  );
}
