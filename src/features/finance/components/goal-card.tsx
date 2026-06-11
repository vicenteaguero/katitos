import { Trash2 } from 'lucide-react';
import { formatMoney, formatDate } from '@kernel/lib';
import { Card, IconButton, toast } from '@kernel/ui';
import { useDeleteGoal } from '../api/finance.mutations';
import { savedFor, type GoalWithContribs } from '../types';

export function GoalCard({
  goal,
  onOpen,
}: {
  goal: GoalWithContribs;
  onOpen: (goal: GoalWithContribs) => void;
}) {
  const del = useDeleteGoal();
  const saved = savedFor(goal);
  const target = goal.target_amount;
  const pct =
    target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;

  const handleDelete = () => {
    if (confirm(`Delete "${goal.title}"?`)) {
      del.mutate(goal.id, {
        onSuccess: () => toast.success('Deleted'),
        onError: (e) => toast.error(e.message),
      });
    }
  };

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onOpen(goal)}
        >
          <h3 className="truncate font-display text-2xl font-semibold tracking-tight text-fg">
            {goal.title}
          </h3>
          {goal.target_date && (
            <p className="mt-1 text-xs tabular-nums text-muted">
              by {formatDate(goal.target_date)}
            </p>
          )}
        </button>
        <IconButton
          label="Delete"
          className="shrink-0"
          onClick={handleDelete}
          disabled={del.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>

      <button
        type="button"
        className="block w-full text-left"
        onClick={() => onOpen(goal)}
      >
        <div className="h-1.5 w-full overflow-hidden bg-surface gilt-hairline-flat">
          <div
            className="gold-shimmer h-full bg-success transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-3 flex items-baseline justify-between gap-3 text-sm tabular-nums">
          <span className="text-muted">
            <span className="gilt-text text-base font-semibold">
              {formatMoney(saved, goal.currency)}
            </span>{' '}
            / {formatMoney(target, goal.currency)}
          </span>
          <span className="shrink-0 font-semibold text-success">{pct}%</span>
        </p>
      </button>
    </Card>
  );
}
