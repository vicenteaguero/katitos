import { Pencil, Trash2 } from 'lucide-react';
import { useNow } from '@kernel/hooks';
import { countdownTo } from '@kernel/lib';
import { Card, IconButton } from '@kernel/ui';
import type { Countdown } from '../types';

/** One d/h/m/s digit pair: a gilt tabular numeral over a quiet copper label. */
function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="gilt-text font-display text-3xl font-semibold gilt-figures">
        {String(value).padStart(2, '0')}
      </span>
      <span className="mt-1.5 font-sans text-[0.625rem] uppercase tracking-[0.22em] text-copper">
        {label}
      </span>
    </div>
  );
}

export function CountdownCard({
  countdown,
  onEdit,
  onDelete,
  featured = false,
}: {
  countdown: Countdown;
  onEdit: (c: Countdown) => void;
  onDelete: (c: Countdown) => void;
  /** Presentation only: the nearest upcoming event earns the footlight + flicker. */
  featured?: boolean;
}) {
  const now = useNow(1000);
  const p = countdownTo(countdown.target_at, now);

  return (
    <Card
      className={featured ? 'footlight candle-flicker space-y-5' : 'space-y-4'}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-2xl leading-none">
            {countdown.emoji ?? '⏳'}
          </span>
          <h3 className="truncate font-display text-2xl font-semibold leading-tight tracking-tight text-fg">
            {countdown.title}
          </h3>
        </div>
        <div className="flex shrink-0 gap-1">
          <IconButton label="Edit" onClick={() => onEdit(countdown)}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton label="Delete" onClick={() => onDelete(countdown)}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      {p.isPast ? (
        <p className="font-display text-2xl font-medium italic tracking-tight text-copper">
          Arrived
        </p>
      ) : featured ? (
        <div className="flex items-end gap-5">
          <Unit value={p.days} label="days" />
          <Unit value={p.hours} label="hrs" />
          <Unit value={p.minutes} label="min" />
          <Unit value={p.seconds} label="sec" />
        </div>
      ) : (
        <div className="flex items-end gap-4">
          <Unit value={p.days} label="days" />
          <Unit value={p.hours} label="hrs" />
          <Unit value={p.minutes} label="min" />
        </div>
      )}

      {countdown.notes && (
        <p className="truncate font-sans text-sm text-muted">
          {countdown.notes}
        </p>
      )}
    </Card>
  );
}
