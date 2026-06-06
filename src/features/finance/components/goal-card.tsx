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
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onOpen(goal)}
        >
          <h3 className="truncate text-lg font-semibold">{goal.title}</h3>
          {goal.target_date && (
            <p className="text-xs text-muted">
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
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1.5 text-sm tabular-nums text-muted">
          <span className="font-semibold text-fg">
            {formatMoney(saved, goal.currency)}
          </span>{' '}
          / {formatMoney(target, goal.currency)}
          <span className="ml-1 text-accent">({pct}%)</span>
        </p>
      </button>
    </Card>
  );
}
