import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn, tap } from '@kernel/lib';
import { money } from '../lib/money';
import type { Goal } from '../lib/goals';

/**
 * One of the five, as a thing you press.
 *
 * A full-width row, not a tile in a grid: five rows read down like a day, and a
 * row is a thumb's worth of target anywhere along its length.
 *
 * What the row does NOT say is the important part. It used to print "$3 at
 * stake" on every open goal, so a fresh morning showed her five copies of the
 * price of her own day, which is the one thing a person with depression does not
 * need before breakfast. The money is real and it is on the screen once, at the
 * top. A row says what it is and whether she has it.
 *
 * Done is a wine wash and a tick, deliberately not the streak's gilt disc and
 * seal: these two widgets sit next to each other on Home and they mean different
 * things - one is a run the two of them share, one is a day of hers - so they are
 * allowed to look different.
 */
export function GoalRow({
  goal,
  done,
  revoked,
  interactive,
  giftCents,
  onToggle,
}: {
  goal: Goal;
  done: boolean;
  /** He took this one back. Shown to him; she is told by him, not by an app. */
  revoked?: boolean;
  interactive: boolean;
  giftCents: number;
  onToggle?: () => void;
}) {
  const press = () => {
    if (!interactive) return;
    tap(done ? 'off' : 'on');
    onToggle?.();
  };

  const body: ReactNode = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg',
          done ? 'bg-accent text-accent-fg' : 'bg-fg/[0.06]',
          !interactive && !done && 'opacity-50'
        )}
      >
        {done ? <Check className="h-5 w-5" strokeWidth={2.5} /> : goal.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-sans text-sm font-semibold text-fg">
          {goal.label}
          {revoked && (
            <span className="ml-2 font-normal text-muted">not counted</span>
          )}
        </span>
        <span className="block truncate font-sans text-xs text-muted">
          {goal.hint}
        </span>
      </span>
      {done && (
        <span className="shrink-0 font-sans text-xs font-semibold tabular-nums text-gold">
          +{money(giftCents)}
        </span>
      )}
    </>
  );

  const shape = cn(
    'flex w-full items-center gap-3 rounded px-3 py-2.5 text-left transition-colors duration-150',
    done ? 'bg-accent/[0.18]' : 'bg-surface-2'
  );

  // A closed day is not a broken button. A disabled <button> leaves the row out
  // of the tab order and out of a screen reader's reach, and her history is
  // almost entirely closed days - so when there is nothing to press, this is
  // text, the way the language kit does it.
  if (!interactive) {
    return (
      <span
        className={shape}
        aria-label={`${goal.label}, ${done ? 'done' : 'not done'}`}
      >
        {body}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={press}
      aria-pressed={done}
      className={cn(shape, 'lift-press')}
    >
      {body}
    </button>
  );
}
