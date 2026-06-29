import { Link } from 'react-router';
import { Plane } from 'lucide-react';
import { useNow } from '@kernel/hooks';
import { DateTime } from '@kernel/lib';

// Departure: Sunday 5 July 2026, 09:50 Novosibirsk time (UTC+7) — the moment
// the summer actually begins. A fixed instant, so it ticks the same on both
// phones regardless of where each of us is standing.
const DEPART = DateTime.fromISO('2026-07-05T09:50:00+07:00');

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * A slim, live one-liner countdown to take-off — sits between the greeting and
 * the kept hero. Days · hours · minutes · seconds, ticking, gilt figures.
 */
export function SummerCountdownWidget() {
  const now = useNow(1000);
  const diff = DEPART.diff(now, ['days', 'hours', 'minutes', 'seconds']);
  const past = diff.toMillis() <= 0;

  return (
    <Link
      to="/summer"
      className="lift-press flex items-center justify-center gap-2.5 rounded-full px-4 py-2"
      style={{
        border: '1px solid rgba(201,162,75,.22)',
        background: 'linear-gradient(165deg, #1c0d15, #160a11)',
      }}
    >
      <Plane className="h-3.5 w-3.5 shrink-0 text-copper" strokeWidth={2} />
      {past ? (
        <span className="font-display text-sm font-semibold italic text-fg">
          We’re away ❤️
        </span>
      ) : (
        <>
          <span className="font-sans text-[0.6rem] font-bold uppercase tracking-[0.22em] text-copper">
            Our summer
          </span>
          <span className="flex items-baseline gap-1.5 font-display text-[1.425rem] font-semibold tabular-nums tracking-tight">
            <span className="inline-flex items-baseline">
              <span className="gilt-text gilt-figures">
                {Math.floor(diff.days)}
              </span>
              <span className="ml-1 text-[0.87rem] font-semibold text-copper/70">
                {Math.floor(diff.days) === 1 ? 'day' : 'days'}
              </span>
            </span>
            <span className="inline-flex items-baseline">
              <span className="gilt-text gilt-figures">
                {diff.hours}:{pad(diff.minutes)}:
              </span>
              <span
                key={Math.floor(diff.seconds)}
                className="count-tick gilt-text gilt-figures"
              >
                {pad(Math.floor(diff.seconds))}
              </span>
            </span>
          </span>
        </>
      )}
    </Link>
  );
}
