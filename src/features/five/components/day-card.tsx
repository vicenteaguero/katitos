import { useMemo } from 'react';
import { type DateTime } from 'luxon';
import { Button, Card, Kicker } from '@kernel/ui';
import { GOALS, type GoalId } from '../lib/goals';
import { money, splitDay, type Stakes } from '../lib/money';
import { closesAt, dayName } from '../lib/five-days';
import { GoalRow } from './goal-row';
import type { FiveMark } from '../types';

/**
 * A day, with its five rows and what it is about to cost.
 *
 * Today and, while the grace window is open, yesterday - both as full cards, so
 * fixing last night is the same gesture as ticking this morning rather than a
 * trip into a history screen. A closed day he opens from the strip uses the same
 * card, which is why the heading takes its words from `dayName` and not from
 * "Today".
 */
export function DayCard({
  day,
  zone,
  marks,
  hardDay,
  paused,
  stakes,
  canMark,
  isToday,
  onToggle,
  onHardDay,
  onUndoHardDay,
  hardDaySpent,
  now,
}: {
  day: string;
  zone: string | null;
  marks: FiveMark[];
  hardDay: boolean;
  paused: boolean;
  stakes: Stakes;
  canMark: boolean;
  /** Today needs no closing time; yesterday's is the whole reason it is here. */
  isToday: boolean;
  onToggle: (goalId: GoalId, done: boolean) => void;
  onHardDay?: () => void;
  onUndoHardDay?: () => void;
  /** She has already used this week's hard day, so the button says so. */
  hardDaySpent: boolean;
  now: DateTime;
}) {
  const ofDay = useMemo(() => marks.filter((m) => m.day === day), [marks, day]);
  const live = useMemo(
    () => ofDay.filter((m) => !m.revoked_at).map((m) => m.goal_id),
    [ofDay]
  );
  const split = splitDay({ done: live, hardDay, paused, stakes });
  const heading = dayName(day, zone, now);

  // The grace window, named, and only on the card it is holding open.
  const closing =
    !isToday && canMark
      ? closesAt(day, zone)
          .setZone(zone ?? 'UTC')
          .toFormat('H:mm')
      : null;

  return (
    <Card tone="hairline" className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-xl font-semibold tracking-tight text-fg">
            {heading}
          </h2>
          {closing && (
            <Kicker tone="muted">open until {closing} this morning</Kicker>
          )}
        </div>
        <span className="shrink-0 text-right">
          <span className="block font-display text-lg font-semibold text-gold tabular-nums">
            {split.done.length} of {GOALS.length}
          </span>
          <Kicker tone="muted">
            {split.free
              ? 'nothing moves'
              : split.betCents > 0
                ? `${money(split.betCents)} at stake`
                : 'all of it yours'}
          </Kicker>
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {GOALS.map((goal) => {
          const mark = ofDay.find((m) => m.goal_id === goal.id);
          const done = !!mark && !mark.revoked_at;
          return (
            <GoalRow
              key={goal.id}
              goal={goal}
              done={done}
              revoked={!!mark?.revoked_at}
              free={split.free}
              interactive={canMark && !hardDay}
              giftCents={stakes.giftCents}
              betCents={stakes.betCents}
              onToggle={() => onToggle(goal.id, done)}
            />
          );
        })}
      </div>

      {hardDay ? (
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 font-sans text-xs leading-relaxed text-muted">
            You called this one a hard day. Nothing moved, and nothing was owed.
          </p>
          {onUndoHardDay && (
            <Button variant="quiet" size="xs" onClick={onUndoHardDay}>
              Undo
            </Button>
          )}
        </div>
      ) : (
        onHardDay &&
        canMark && (
          <Button
            variant="ghost"
            size="xs"
            className="self-start"
            disabled={hardDaySpent}
            onClick={onHardDay}
          >
            {hardDaySpent
              ? 'Hard day already used this week'
              : 'Today was hard'}
          </Button>
        )
      )}
    </Card>
  );
}
