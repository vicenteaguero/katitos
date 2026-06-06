import { Link } from 'react-router';
import { useCouple } from '@kernel/couple';
import { daysTogether } from '@kernel/lib';
import { Card, CardTitle } from '@kernel/ui';

export function DaysTogetherWidget() {
  const { data: couple } = useCouple();
  const days = daysTogether(couple?.relationship_start_date);
  return (
    <Link to="/together">
      <Card className="h-full">
        <CardTitle>Together</CardTitle>
        <p className="text-3xl font-bold text-accent">
          {days.toLocaleString()}
        </p>
        <p className="text-xs text-muted">days</p>
      </Card>
    </Link>
  );
}
