import { Link } from 'react-router';
import { Plane } from 'lucide-react';
import { useNow } from '@kernel/hooks';
import { countdownTo } from '@kernel/lib';
import { useSummerTrip } from '../api/summer.queries';

/**
 * Home hero: the running countdown to the day the summer begins (Istanbul).
 * Reads the special trip's start_date; silent until a date exists so Home
 * never shows an empty shell.
 */
export function SummerCountdownWidget() {
  const { data: trip } = useSummerTrip();
  const now = useNow(60_000);
  if (!trip?.start_date) return null;

  const { days, isPast } = countdownTo(`${trip.start_date}T00:00:00`, now);

  return (
    <Link
      to="/summer"
      className="lift-press relative block overflow-hidden rounded px-5 py-6 text-center"
      style={{
        border: '1px solid rgba(201,162,75,.26)',
        background: 'linear-gradient(165deg, #211019, #190b12)',
      }}
    >
      <span
        className="pointer-events-none absolute bottom-[-30px] left-1/2 h-[70px] w-[180px] -translate-x-1/2"
        style={{
          background:
            'radial-gradient(circle at 50% 100%, rgba(181,99,58,.28), transparent 70%)',
        }}
        aria-hidden="true"
      />
      <span className="relative inline-flex items-center gap-1.5 font-sans text-[10.5px] font-bold uppercase tracking-[0.25em] text-copper">
        <Plane className="h-3.5 w-3.5" strokeWidth={2} />
        {isPast ? 'Our summer, together' : 'Our summer · Türkiye → Georgia'}
      </span>
      {isPast ? (
        <p className="relative mt-2 font-display text-4xl font-semibold italic text-fg">
          We’re away ❤️
        </p>
      ) : (
        <p className="relative mt-2 flex items-baseline justify-center gap-2">
          <span className="gilt-text gilt-figures font-display text-[3.9rem] font-semibold">
            {days}
          </span>
          <span className="font-sans text-xs uppercase tracking-[0.2em] text-copper">
            {days === 1 ? 'day' : 'days'}
          </span>
        </p>
      )}
    </Link>
  );
}
