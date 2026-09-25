import { useMemo } from 'react';
import type { DateTime } from 'luxon';
import { Button, Card, StatPill } from '@kernel/ui';
import { GOALS, type GoalId } from '../lib/goals';
import { money, splitDay, type Stakes } from '../lib/money';
import { dayName } from '../lib/five-days';
import { GoalRow } from './goal-row';
import type { GoalTick } from '../types';

/**
 * A day, with its five rows.
 *
 * Today and, while the grace window is open, yesterday - both as full cards, so
 * fixing last night is the same gesture as ticking this morning rather than a
 * trip into a history screen. A closed day he opens from the strip uses the same
 * card, which is why the heading takes its words from `dayName`.
 *
 * The money on this card appears in the evening and not before. A day that has
 * barely started has nothing at stake yet in any useful sense, and printing
 * "$15 at stake" over an untouched morning is a bill for a day she has not lived.
 */

/** From this hour on her clock, the day is short enough to name the number. */
const EVENING_HOUR = 18;

export function DayCard({
  day,
  zone,
  ticks,
  hardDay,
  hardDayNote,
  paused,
  stakes,
  canMark,
  isToday,
  isKeeper,
  onToggle,
  onHardDay,
  onUndoHardDay,
  hardDaySpent,
  hardDayNeeds = 3,
  now,
}: {
  day: string;
  zone: string | null;
  ticks: GoalTick[];
  hardDay: boolean;
  /** What she said about it, if she said anything. */
  hardDayNote?: string | null;
  paused: boolean;
  stakes: Stakes;
  canMark: boolean;
  /** Today needs no closing time; yesterday's is the whole reason it is here. */
  isToday: boolean;
  /** He sees that a tap was taken back. She hears it from him, not from a row. */
  isKeeper: boolean;
  onToggle: (goalId: GoalId, done: boolean) => void;
  onHardDay?: () => void;
  onUndoHardDay?: () => void;
  /** She has already used this week's hard day. */
  hardDaySpent: boolean;
  /** How many of the five must still be missing before the valve is offered. */
  hardDayNeeds?: number;
  now: DateTime;
}) {
  const ofDay = useMemo(() => ticks.filter((t) => t.day === day), [ticks, day]);
  const live = useMemo(
    () => ofDay.filter((t) => !t.revokedAt).map((t) => t.goalId),
    [ofDay]
  );
  const split = splitDay({ done: live, hardDay, paused, stakes });
  const heading = dayName(day, zone, now);

  // Yesterday is on the screen because it is still hers to fix, and the card
  // says so rather than naming an hour: the window closes when the day after it
  // ends on whichever of their two clocks is behind, which is not a time she
  // should have to work out.
  const closing = !isToday && canMark ? 'still open' : null;

  const evening =
    !isToday || (now.setZone(zone ?? 'UTC').hour ?? 0) >= EVENING_HOUR;
  const note = split.forgiven
    ? 'nothing to lose today'
    : split.betCents > 0
      ? evening
        ? `${money(split.betCents)} still open`
        : 'the day is young'
      : 'all of it yours';

  return (
    <Card tone="flat" className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-2xl font-semibold tracking-tight text-fg">
            {heading}
          </h2>
          {closing && (
            <p className="font-sans text-[11px] text-muted">{closing}</p>
          )}
        </div>
        <StatPill
          value={`${split.done.length} of ${GOALS.length}`}
          label={note}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        {GOALS.map((goal) => {
          const tick = ofDay.find((t) => t.goalId === goal.id);
          const done = !!tick && !tick.revokedAt;
          return (
            <GoalRow
              key={goal.id}
              goal={goal}
              done={done}
              revoked={isKeeper && !!tick?.revokedAt}
              interactive={canMark}
              giftCents={stakes.giftCents}
              onToggle={() => onToggle(goal.id, done)}
            />
          );
        })}
      </div>

      {hardDay ? (
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 font-sans text-xs leading-relaxed text-muted">
            {hardDayNote ? (
              <span className="text-fg">&ldquo;{hardDayNote}&rdquo;</span>
            ) : (
              'You called this one a hard day. It cost nothing, and nothing was asked.'
            )}
          </p>
          {onUndoHardDay && (
            <Button variant="quiet" size="xs" onClick={onUndoHardDay}>
              Undo
            </Button>
          )}
        </div>
      ) : (
        onHardDay &&
        canMark &&
        // Spent, and so not offered. A disabled button saying she has already
        // used it is a line about a thing she cannot do, sitting on the screen
        // all week; the valve is meant to be quiet when it is closed.
        !hardDaySpent &&
        // And it is for a day that is going badly, not for saving the last three
        // dollars of a good one. Hidden rather than refused: the first she hears
        // of this rule should not be an error message.
        split.missed.length >= hardDayNeeds && (
          <Button
            variant="ghost"
            size="xs"
            className="self-start"
            onClick={onHardDay}
          >
            Today was hard
          </Button>
        )
      )}
    </Card>
  );
}
