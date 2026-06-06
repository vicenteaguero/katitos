import { Link } from 'react-router';
import { Card, CardTitle } from '@kernel/ui';
import { useGoals } from '../api/finance.queries';
import { savedFor } from '../types';

export function FinanceWidget() {
  const { data } = useGoals();
  const goal = data?.[0];

  const pct = goal
    ? goal.target_amount > 0
      ? Math.min(100, Math.round((savedFor(goal) / goal.target_amount) * 100))
      : 0
    : 0;

  return (
    <Link to="/finance">
      <Card className="h-full">
        <CardTitle>Saving for us</CardTitle>
        {goal ? (
          <>
            <p className="mt-1 truncate text-base font-semibold">
              {goal.title}
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums text-accent">
              {pct}%
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">No goals yet</p>
        )}
      </Card>
    </Link>
  );
}
