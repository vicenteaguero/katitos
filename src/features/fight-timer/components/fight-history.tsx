import { Trash2 } from 'lucide-react';
import { DateTime, relativeTime } from '@kernel/lib';
import { Card, IconButton, toast } from '@kernel/ui';
import { useDeleteFight } from '../api/fights.mutations';
import type { Fight } from '../types';

/** Human "Xh Ym" (or "Xm Ys" under an hour) between two ISO timestamps. */
function durationLabel(startedAt: string, endedAt: string): string {
  const dur = DateTime.fromISO(endedAt)
    .diff(DateTime.fromISO(startedAt))
    .shiftTo('hours', 'minutes', 'seconds');
  const hours = Math.max(0, Math.floor(dur.hours));
  const minutes = Math.max(0, Math.floor(dur.minutes));
  const seconds = Math.max(0, Math.floor(dur.seconds));
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function HistoryRow({ fight }: { fight: Fight }) {
  const del = useDeleteFight();

  const handleDelete = () => {
    if (!confirm('Delete this fight from history?')) return;
    del.mutate(fight.id, {
      onSuccess: () => toast.success('Deleted'),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <Card className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold">
            {fight.reason ?? 'A fight'}
          </h3>
          {fight.ended_at && (
            <span className="shrink-0 text-xs tabular-nums text-muted">
              {durationLabel(fight.started_at, fight.ended_at)}
            </span>
          )}
        </div>
        {fight.resolution && (
          <p className="mt-1 text-sm text-fg">{fight.resolution}</p>
        )}
        {fight.ended_at && (
          <p className="mt-1 text-xs text-muted">
            Made up {relativeTime(fight.ended_at)}
          </p>
        )}
      </div>
      <IconButton
        label="Delete"
        className="shrink-0"
        onClick={handleDelete}
        disabled={del.isPending}
      >
        <Trash2 className="h-4 w-4" />
      </IconButton>
    </Card>
  );
}

export function FightHistory({ fights }: { fights: Fight[] }) {
  return (
    <div className="space-y-3">
      {fights.map((fight) => (
        <HistoryRow key={fight.id} fight={fight} />
      ))}
    </div>
  );
}
