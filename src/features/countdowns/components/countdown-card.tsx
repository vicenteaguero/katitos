import { Pencil, Trash2 } from 'lucide-react';
import { useNow } from '@kernel/hooks';
import { countdownTo } from '@kernel/lib';
import { Card, IconButton } from '@kernel/ui';
import type { Countdown } from '../types';

export function CountdownCard({
  countdown,
  onEdit,
  onDelete,
}: {
  countdown: Countdown;
  onEdit: (c: Countdown) => void;
  onDelete: (c: Countdown) => void;
}) {
  const now = useNow(1000);
  const p = countdownTo(countdown.target_at, now);

  return (
    <Card className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">{countdown.emoji ?? '⏳'}</span>
          <h3 className="truncate font-semibold">{countdown.title}</h3>
        </div>
        <p className="mt-1 text-sm tabular-nums text-accent">
          {p.isPast
            ? 'Arrived! 🎉'
            : `${p.days}d ${p.hours}h ${p.minutes}m ${p.seconds}s`}
        </p>
        {countdown.notes && (
          <p className="truncate text-xs text-muted">{countdown.notes}</p>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        <IconButton label="Edit" onClick={() => onEdit(countdown)}>
          <Pencil className="h-4 w-4" />
        </IconButton>
        <IconButton label="Delete" onClick={() => onDelete(countdown)}>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
    </Card>
  );
}
