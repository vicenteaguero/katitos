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
            <p className="mt-1 truncate font-display text-lg font-semibold tracking-tight text-fg">
              {goal.title}
            </p>
            <div className="mt-3 h-1.5 w-full overflow-hidden bg-surface gilt-hairline-flat">
              <div
                className="gold-shimmer h-full bg-success"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="gilt-text mt-2 text-3xl font-semibold tabular-nums">
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
