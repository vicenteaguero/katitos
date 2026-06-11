import { Link } from 'react-router';
import { useCouple } from '@kernel/couple';
import { daysTogether } from '@kernel/lib';
import { Card, CardTitle } from '@kernel/ui';

export function DaysTogetherWidget() {
  const { data: couple } = useCouple();
  const days = daysTogether(couple?.relationship_start_date);
  return (
    <Link to="/together">
      <Card className="lift-press flex h-full flex-col">
        <CardTitle className="text-xl">Together</CardTitle>
        <p className="gilt-text gold-shimmer mt-3 font-display text-4xl font-semibold leading-none tabular-nums">
          {days.toLocaleString()}
        </p>
        <p className="mt-2 font-sans text-xs uppercase tracking-[0.28em] text-muted">
          days
        </p>
      </Card>
    </Link>
  );
}
