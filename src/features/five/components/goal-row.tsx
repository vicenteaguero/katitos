import { Check } from 'lucide-react';
import { cn } from '@kernel/lib';
import { money } from '../lib/money';
import type { Goal } from '../lib/goals';

/**
 * One of the five, as a thing you press.
 *
 * A full-width row, not a tile in a grid: five rows read down like a day, and a
 * row is a thumb's worth of target anywhere along its length. Done is a wine
 * wash and a tick; open is quiet, never red, and never a percentage.
 *
 * What a row says about money changes with who is looking at it and whether the
 * day is still hers to change - but it never says it twice. Open rows carry the
 * three dollars at stake, done rows carry the dollar they earned, and on a free
 * day nothing carries anything, because nothing is moving.
 */
export function GoalRow({
  goal,
  done,
  revoked,
  free,
  interactive,
  giftCents,
  betCents,
  onToggle,
}: {
  goal: Goal;
  done: boolean;
  /** He took this one back. The row still shows what she said. */
  revoked?: boolean;
  /** A hard day or a paused Five: the row is real, the money is not. */
  free?: boolean;
  interactive: boolean;
  giftCents: number;
  betCents: number;
  onToggle?: () => void;
}) {
  const press = () => {
    if (!interactive) return;
    navigator.vibrate?.(done ? [0, 12] : [0, 26]);
    onToggle?.();
  };

  const note = free
    ? null
    : done
      ? `+${money(giftCents)}`
      : `${money(betCents)} at stake`;

  return (
    <button
      type="button"
      onClick={press}
      disabled={!interactive}
      aria-pressed={done}
      className={cn(
        'flex w-full items-center gap-3 rounded px-3 py-2.5 text-left transition-colors duration-150',
        done ? 'bg-accent/[0.18]' : 'bg-surface-2',
        interactive ? 'lift-press' : 'cursor-default',
        !interactive && !done && 'opacity-55'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg',
          done ? 'bg-accent text-accent-fg' : 'bg-fg/[0.06]'
        )}
      >
        {done ? <Check className="h-5 w-5" strokeWidth={2.5} /> : goal.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-sans text-sm font-semibold text-fg">
          {goal.label}
          {revoked && (
            <span className="ml-2 font-normal normal-case text-muted">
              taken back
            </span>
          )}
        </span>
        <span className="block truncate font-sans text-xs text-muted">
          {goal.hint}
        </span>
      </span>
      {note && (
        <span
          className={cn(
            'shrink-0 font-sans text-xs font-semibold tabular-nums',
            done ? 'text-gold' : 'text-muted'
          )}
        >
          {note}
        </span>
      )}
    </button>
  );
}
