import { DateTime } from 'luxon';
import { cn } from '@kernel/lib';
import { Kicker } from '@kernel/ui';
import { GOALS, GOAL_IDS } from '../lib/goals';
import type { FiveDayRow, FiveMark } from '../types';

/**
 * The last few weeks, as a shape rather than a score.
 *
 * One slim bar a day, filled from the floor by how many of the five she held.
 * Not five stacked squares a day: twenty-one columns of those is a wall of
 * tiles, which is the one layout this app does not do, and it made a quiet
 * fortnight look like a spreadsheet of failures.
 *
 * What the wall was good for - seeing WHICH goal keeps going missing - is
 * answered underneath instead, in words, most-missed first. Deliberately NOT as
 * five proportional meters: a meter is a percentage drawn, and the goal she
 * wants to notice would draw the emptiest bar, so "the walk goes on Wednesdays"
 * would render as "you are worst at walking".
 *
 * No number, no streak, no red. A hard day is a single muted dash on the floor:
 * a day she was allowed to miss must not draw like a day she failed.
 */
export function DayStrip({
  days,
  marks,
  dayRows,
  zone,
  now,
  onPick,
}: {
  /** Newest first, as `recentDays` returns them. */
  days: string[];
  marks: FiveMark[];
  dayRows: FiveDayRow[];
  zone: string | null;
  now: DateTime;
  /** Only he gets one: tapping a day opens it to be put right. */
  onPick?: (day: string) => void;
}) {
  const today = now.setZone(zone ?? 'UTC').toISODate();
  const held = new Set(
    marks.filter((m) => !m.revoked_at).map((m) => `${m.day}:${m.goal_id}`)
  );
  const hard = new Set(dayRows.filter((d) => d.hard_day).map((d) => d.day));
  const ordered = [...days].reverse();
  const heldOn = (day: string) =>
    GOAL_IDS.filter((id) => held.has(`${day}:${id}`)).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div
          className="flex h-12 items-end gap-[3px]"
          role="img"
          aria-label={`The last ${days.length} days, each bar a day, taller when more of the five were held`}
        >
          {ordered.map((day) => {
            const isHard = hard.has(day);
            const n = heldOn(day);
            const bar = (
              <span
                className={cn(
                  'flex h-full w-full flex-col justify-end bg-fg/[0.05]',
                  day === today && 'bg-fg/[0.09]'
                )}
              >
                <span
                  className={cn('w-full', isHard ? 'bg-muted/40' : 'bg-gold')}
                  style={{
                    // The one genuinely dynamic value on the screen. A hard day is
                    // a floor line, not a height.
                    height: isHard ? 3 : `${(n / GOAL_IDS.length) * 100}%`,
                  }}
                />
              </span>
            );
            const label = `${DateTime.fromISO(day, { zone: 'utc' }).toFormat('d LLL')}, ${
              isHard ? 'a hard day' : `${n} of ${GOAL_IDS.length}`
            }`;
            return onPick ? (
              <button
                key={day}
                type="button"
                onClick={() => onPick(day)}
                aria-label={label}
                className="h-12 min-w-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                {bar}
              </button>
            ) : (
              <span key={day} className="h-12 min-w-0 flex-1">
                {bar}
              </span>
            );
          })}
        </div>

        <div className="flex items-baseline justify-between">
          <Kicker tone="muted">
            {DateTime.fromISO(ordered[0] ?? '', { zone: 'utc' }).toFormat(
              'd LLL'
            )}
          </Kicker>
          <Kicker tone="muted">today</Kicker>
        </div>
      </div>

      <GoalTally days={days} held={held} />
    </div>
  );
}

/**
 * Which of the five actually goes missing.
 *
 * The useful half of the old wall, said out loud and sorted so the one that
 * slips is on top. No meter: this is the line that turns "I am bad at this" into
 * "the walk goes on Wednesdays", and a proportional bar would say the first
 * thing again in a shape.
 */
function GoalTally({ days, held }: { days: string[]; held: Set<string> }) {
  const rows = GOALS.map((goal) => ({
    goal,
    n: days.filter((d) => held.has(`${d}:${goal.id}`)).length,
  })).sort((a, b) => a.n - b.n);

  return (
    <div className="flex flex-col gap-1">
      {rows.map(({ goal, n }) => (
        <div
          key={goal.id}
          className="flex items-baseline justify-between gap-3"
        >
          <span className="min-w-0 truncate font-sans text-xs text-muted">
            {goal.label}
          </span>
          <span className="shrink-0 font-sans text-xs tabular-nums text-muted">
            {n} of {days.length}
          </span>
        </div>
      ))}
    </div>
  );
}
