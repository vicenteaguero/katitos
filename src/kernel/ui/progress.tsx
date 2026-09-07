import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

const TRACK = 'rgba(251,245,240,.1)';
const FILL = 'linear-gradient(90deg, #9c7a2e, #e4c36a)';

/** Above this many, segments read as noise: draw one continuous bar. */
const MAX_SEGMENTS = 12;

/**
 * How far along: a thin gilt bar. With `segments`, one pill per step
 * (a study session, a class): done ones lit, the current one half-lit.
 */
export function ProgressBar({
  value,
  max = 1,
  segments,
  label,
  className,
}: {
  value: number;
  max?: number;
  /** One pill per step; `value` is then the CURRENT step (0-based). */
  segments?: number;
  label?: string;
  className?: string;
}) {
  const segmented = !!segments && segments > 0 && segments <= MAX_SEGMENTS;
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const aria = {
    role: 'progressbar' as const,
    'aria-label': label,
    'aria-valuemin': 0,
    'aria-valuemax': segmented ? segments : max,
    'aria-valuenow': segmented ? value : Math.min(value, max),
  };
  if (segmented) {
    return (
      <div className={cn('flex gap-1.5', className)} {...aria}>
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className="block h-1 flex-1 rounded-[2px]"
            style={{
              background:
                i < value
                  ? '#e4c36a'
                  : i === value
                    ? 'rgba(228,195,106,.55)'
                    : TRACK,
            }}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      className={cn('h-1 w-full overflow-hidden rounded-[2px]', className)}
      style={{ background: TRACK }}
      {...aria}
    >
      <span
        className="block h-full rounded-[2px] transition-[width] duration-300"
        style={{ width: `${pct * 100}%`, background: FILL }}
      />
    </div>
  );
}

/**
 * The same, as a ring, with room in the middle for the number.
 */
export function Ring({
  value,
  max = 1,
  size = 56,
  stroke = 4,
  label,
  children,
  className,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  label?: string;
  children?: ReactNode;
  className?: string;
}) {
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center',
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={TRACK}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e4c36a"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="relative font-sans font-bold tabular-nums text-gold">
        {children}
      </span>
    </span>
  );
}
