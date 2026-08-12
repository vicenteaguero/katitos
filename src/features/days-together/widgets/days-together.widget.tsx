import { Link } from 'react-router';
import { daysTogetherNow } from '@kernel/lib';
import { Card, CardTitle } from '@kernel/ui';

export function DaysTogetherWidget() {
  // Straight arithmetic — see `daysTogetherNow`. This used to wait on a
  // query and show 0 until it arrived.
  const days = daysTogetherNow();
  return (
    <Link to="/together">
      <Card className="lift-press flex h-full flex-col">
        <CardTitle className="text-xl">Together</CardTitle>
        <p className="gilt-text gold-shimmer mt-3 font-display text-4xl font-semibold gilt-figures">
          {days.toLocaleString()}
        </p>
        <p className="mt-2 font-sans text-xs uppercase tracking-[0.28em] text-muted">
          days
        </p>
      </Card>
    </Link>
  );
}
