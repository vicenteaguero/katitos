import { Link } from 'react-router';
import { useNow } from '@kernel/hooks';
import { DateTime } from '@kernel/lib';
import { Card, CardTitle } from '@kernel/ui';
import { useActiveFight } from '../api/fights.queries';

export function FightTimerWidget() {
  const { data: active } = useActiveFight();
  const now = useNow(1000);

  let body = (
    <p className="mt-2 font-display text-lg italic text-muted">All good ❤️</p>
  );
  if (active) {
    const dur = now
      .diff(DateTime.fromISO(active.started_at))
      .shiftTo('hours', 'minutes');
    const hours = Math.max(0, Math.floor(dur.hours));
    const minutes = Math.max(0, Math.floor(dur.minutes));
    body = (
      <p className="gilt-text candle-flicker mt-2 font-display text-2xl font-semibold tabular-nums leading-none">
        Cooling {hours}h {minutes}m
      </p>
    );
  }

  return (
    <Link to="/fights">
      <Card className="h-full">
        <CardTitle>Fights</CardTitle>
        {body}
      </Card>
    </Link>
  );
}
