import { Link } from 'react-router';
import { Mountain } from 'lucide-react';
import { useNow } from '@kernel/hooks';
import { countdownTo } from '@kernel/lib';
import { Card } from '@kernel/ui';
import { useGeorgiaTrip } from '../api/georgia.queries';

/**
 * Home hero: the running countdown to the day we fly to Georgia. Reads the
 * special trip's start_date; stays silent until a date exists so Home never
 * shows an empty shell.
 */
export function GeorgiaCountdownWidget() {
  const { data: trip } = useGeorgiaTrip();
  const now = useNow(60_000);
  if (!trip?.start_date) return null;

  const { days, isPast } = countdownTo(`${trip.start_date}T00:00:00`, now);

  return (
    <Link to="/georgia" className="block">
      <Card className="footlight lift-press flex flex-col items-center gap-1.5 py-7 text-center">
        <span className="flex items-center gap-1.5 font-sans text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-copper">
          <Mountain className="h-3.5 w-3.5" />
          {isPast ? 'We made it to Georgia' : 'Our trip to Georgia'}
        </span>
        {isPast ? (
          <p className="font-display text-3xl font-semibold italic text-fg">
            We’re here ❤️
          </p>
        ) : (
          <p className="flex items-baseline gap-2">
            <span className="gilt-text candle-flicker font-display text-6xl font-semibold leading-none tabular-nums">
              {days}
            </span>
            <span className="font-sans text-xs uppercase tracking-[0.22em] text-copper">
              {days === 1 ? 'day' : 'days'}
            </span>
          </p>
        )}
      </Card>
    </Link>
  );
}
