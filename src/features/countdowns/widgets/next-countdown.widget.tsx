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
      <Card className="h-full">
        <CardTitle>Next up</CardTitle>
        {next ? (
          <>
            <p className="mt-1 truncate text-base font-semibold">
              {next.emoji ?? '⏳'} {next.title}
            </p>
            <p className="text-2xl font-bold tabular-nums text-accent">
              {countdownTo(next.target_at, now).days}d
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">No countdowns yet</p>
        )}
      </Card>
    </Link>
  );
}
