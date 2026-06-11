import { Link } from 'react-router';
import { useNow } from '@kernel/hooks';
import { DateTime } from '@kernel/lib';
import { useActiveFight } from '../api/fights.queries';

// Compact single-line dashboard row — a minor widget in the editorial flow.
export function FightTimerWidget() {
  const { data: active } = useActiveFight();
  const now = useNow(1000);

  let body = (
    <span className="font-display text-lg italic text-muted">All good ❤️</span>
  );
  if (active) {
    const dur = now
      .diff(DateTime.fromISO(active.started_at))
      .shiftTo('hours', 'minutes');
    const hours = Math.max(0, Math.floor(dur.hours));
    const minutes = Math.max(0, Math.floor(dur.minutes));
    body = (
      <span className="font-display text-lg font-semibold tabular-nums text-fg">
        Cooling {hours}h {minutes}m
      </span>
    );
  }

  return (
    <Link to="/fights" className="lift-press block">
      <div className="flex items-baseline justify-between gap-3 rounded-lg bg-surface px-6 py-4">
        <span className="font-sans text-sm text-muted">Fights</span>
        {body}
      </div>
    </Link>
  );
}
