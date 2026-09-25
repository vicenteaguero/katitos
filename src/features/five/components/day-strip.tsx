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
 * answered underneath instead, one line per goal, which says it in words.
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
      <div className="flex h-12 items-end gap-[3px]">
        {ordered.map((day) => {
          const isHard = hard.has(day);
          const n = heldOn(day);
          const bar = (
            <span
              className={cn(
                'flex w-full flex-col justify-end rounded-sm bg-fg/[0.05]',
                day === today && 'bg-fg/[0.09]'
              )}
              style={{ height: 48 }}
            >
              <span
                className={cn(
                  'w-full rounded-sm',
                  isHard ? 'bg-muted/40' : 'bg-gold'
                )}
                style={{
                  // A hard day is a floor line, not a height.
                  height: isHard ? 3 : `${(n / GOAL_IDS.length) * 100}%`,
                }}
              />
            </span>
          );
          const label = `${DateTime.fromISO(day).toFormat('d LLL')}, ${
            isHard ? 'a hard day' : `${n} of ${GOAL_IDS.length}`
          }`;
          return onPick ? (
            <button
              key={day}
              type="button"
              onClick={() => onPick(day)}
              aria-label={label}
              className="h-12 min-w-0 flex-1"
            >
              {bar}
            </button>
          ) : (
            <span key={day} className="h-12 min-w-0 flex-1" title={label}>
              {bar}
            </span>
          );
        })}
      </div>

      <div className="flex items-baseline justify-between">
        <Kicker tone="muted">
          {DateTime.fromISO(ordered[0] ?? '').toFormat('d LLL')}
        </Kicker>
        <Kicker tone="muted">today</Kicker>
      </div>

      <GoalTally days={days} held={held} />
    </div>
  );
}

/**
 * Which of the five actually goes missing.
 *
 * The useful half of the old wall, said out loud: five rows, a thin meter and a
 * count. It is the line that turns "I am bad at this" into "the walk goes on
 * Wednesdays", which is the only kind of feedback worth giving someone who is
 * already tired of being measured.
 */
function GoalTally({ days, held }: { days: string[]; held: Set<string> }) {
  return (
    <div className="flex flex-col gap-1.5">
      {GOALS.map((goal) => {
        const n = days.filter((d) => held.has(`${d}:${goal.id}`)).length;
        const pct = days.length ? (n / days.length) * 100 : 0;
        return (
          <div key={goal.id} className="flex items-center gap-2.5">
            <span className="w-24 shrink-0 truncate font-sans text-xs text-muted">
              {goal.label}
            </span>
            <span className="h-1 min-w-0 flex-1 rounded-full bg-fg/[0.07]">
              <span
                className="block h-1 rounded-full bg-gold/70"
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className="w-14 shrink-0 text-right font-sans text-xs tabular-nums text-muted">
              {n} of {days.length}
            </span>
          </div>
        );
      })}
    </div>
  );
}
