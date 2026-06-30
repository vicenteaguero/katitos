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
      className="lift-press flex flex-col items-center gap-1 rounded-2xl px-4 py-3"
      style={{
        border: '1px solid rgba(201,162,75,.22)',
        background: 'linear-gradient(165deg, #1c0d15, #160a11)',
      }}
    >
      {past ? (
        <span className="flex items-center gap-2 font-display text-base font-semibold italic text-fg">
          <Plane className="h-4 w-4 shrink-0 text-copper" strokeWidth={2} />
          We’re away ❤️
        </span>
      ) : (
        <>
          <span className="flex items-center gap-1.5">
            <Plane className="h-3 w-3 shrink-0 text-copper" strokeWidth={2} />
            <span className="font-sans text-[0.6rem] font-bold uppercase tracking-[0.22em] text-copper">
              Our summer
            </span>
          </span>
          <span className="flex items-baseline gap-2 font-display text-[2.85rem] font-semibold leading-none tabular-nums tracking-tight">
            <span className="inline-flex items-baseline">
              <span className="gilt-text gilt-figures">
                {Math.floor(diff.days)}
              </span>
              <span className="ml-1 text-[1.4rem] font-semibold text-copper/70">
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
