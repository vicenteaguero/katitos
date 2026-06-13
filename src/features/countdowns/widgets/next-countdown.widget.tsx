import { Link } from 'react-router';
import { useNow } from '@kernel/hooks';
import { countdownTo } from '@kernel/lib';
import { Card, CardTitle } from '@kernel/ui';
import { useCountdowns } from '../api/countdowns.queries';

export function NextCountdownWidget() {
  const { data } = useCountdowns();
  const now = useNow(1000);
  const upcoming = (data ?? []).filter(
    (c) => countdownTo(c.target_at, now).totalSeconds > 0
  );
  const next = upcoming[0];

  return (
    <Link to="/countdowns">
      <Card className="footlight flex h-full flex-col gap-2">
        <CardTitle>Next up</CardTitle>
        {next ? (
          <>
            <p className="truncate font-display text-xl font-medium italic leading-snug text-copper">
              {next.emoji ?? '⏳'} {next.title}
            </p>
            <p className="mt-auto flex items-baseline gap-1.5">
              <span className="gilt-text candle-flicker font-display text-4xl font-semibold gilt-figures">
                {countdownTo(next.target_at, now).days}
              </span>
              <span className="font-sans text-[0.625rem] uppercase tracking-[0.22em] text-copper">
                days
              </span>
            </p>
          </>
        ) : (
          <p className="mt-2 font-sans text-sm text-muted">No countdowns yet</p>
        )}
      </Card>
    </Link>
  );
}
