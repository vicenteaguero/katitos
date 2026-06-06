import { Link } from 'react-router';
import { useCouple } from '@kernel/couple';
import { useNow } from '@kernel/hooks';
import { countdownTo, nextMonthsversary } from '@kernel/lib';
import { Card, CardTitle } from '@kernel/ui';

export function FlowersWidget() {
  const { data: couple } = useCouple();
  const now = useNow();
  const next = nextMonthsversary(couple?.anniversary_day ?? 15, now);
  const c = countdownTo(next, now);
  return (
    <Link to="/flowers">
      <Card className="h-full">
        <CardTitle>Next flowers</CardTitle>
        <p className="text-3xl font-bold text-accent">{c.days}d</p>
        <p className="text-xs text-muted">💐</p>
      </Card>
    </Link>
  );
}
