import { DateTime } from 'luxon';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@kernel/lib';
import { addDays, monthGrid, monthOf } from '../lib/days';
import type { DayStatus } from '../lib/streak';
import '../streak.css';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export type DayState =
  | 'complete'
  | 'partial'
  | 'missed'
  | 'open'
  | 'future'
  | 'before';

export interface MonthGridProps {
  month: string;
  onMonth: (month: string) => void;
  /** The furthest-ahead clock: nothing past this has happened yet. */
  furthest: string;
  statusOf: (day: string) => DayStatus;
  /** The first day anything was due; before it there was nothing to miss. */
  since: string | null;
  onPick: (day: string) => void;
}

/**
 * The month, so you can see the shape of what you are keeping.
 *
 * A run of days is drawn as one continuous ribbon rather than as separate dots,
 * because a streak is a line, not a score - and the gap where it broke should
 * be the thing your eye lands on first.
 */
export function MonthGrid({
  month,
  onMonth,
  furthest,
  statusOf,
  since,
  onPick,
}: MonthGridProps) {
  const days = monthGrid(month);
  const label = DateTime.fromISO(`${month}-01`, { zone: 'utc' }).toFormat(
    'LLLL yyyy'
  );
  const atStart = month <= '2026-01';
  const atEnd = month >= monthOf(furthest);

  const stateOf = (day: string): DayState => {
    if (day > furthest) return 'future';
    // Before the first habit existed there was nothing to keep, so those days
    // are blank rather than failed. A wall of misses for a month you had not
    // signed up to is a lie the calendar should not tell.
    if (since && day < since) return 'before';
    const st = statusOf(day);
    if (st.complete) return 'complete';
    // Still in play for one of us: the window closes only once the LATER clock
    // has passed the day after it, so her today is open even when mine is not.
    if (addDays(day, 1) >= furthest) return 'open';
    return st.empty ? 'missed' : 'partial';
  };

  const states = new Map(days.map((d) => [d, stateOf(d)] as const));
  const isRun = (day: string) => states.get(day) === 'complete';

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <MonthArrow
          dir="prev"
          disabled={atStart}
          onClick={() => onMonth(monthOf(addDays(`${month}-01`, -1)))}
        />
        <span className="font-display text-lg font-semibold text-fg">
          {label}
        </span>
        <MonthArrow
          dir="next"
          disabled={atEnd}
          onClick={() =>
            onMonth(
              DateTime.fromISO(`${month}-01`, { zone: 'utc' })
                .plus({ months: 1 })
                .toFormat('yyyy-MM')
            )
          }
        />
      </div>

      <div className="grid grid-cols-7 gap-x-2">
        {WEEKDAYS.map((w, i) => (
          <span
            key={i}
            className="pb-1 text-center font-sans text-[10px] font-bold uppercase tracking-[0.1em] text-muted/60"
          >
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-x-2 gap-y-1">
        {days.map((day) => {
          const state = states.get(day)!;
          const run = isRun(day);
          const st = statusOf(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => onPick(day)}
              disabled={state === 'future' || state === 'before'}
              aria-label={DateTime.fromISO(day, { zone: 'utc' }).toFormat(
                'cccc d LLLL'
              )}
              className={cn(
                'cal-cell flex h-11 flex-col items-center justify-center',
                run && 'cal-run',
                run && !isRun(addDays(day, -1)) && 'cal-run--start',
                run && !isRun(addDays(day, 1)) && 'cal-run--end',
                state !== 'future' && state !== 'before' && 'lift-press'
              )}
            >
              <DayDot
                day={day}
                state={state}
                inMonth={monthOf(day) === month}
                status={st}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthArrow({
  dir,
  disabled,
  onClick,
}: {
  dir: 'prev' | 'next';
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? 'Previous month' : 'Next month'}
      className="lift-press grid h-8 w-8 place-items-center rounded-full text-gold disabled:opacity-25"
    >
      <Icon className="h-4 w-4" strokeWidth={2.2} />
    </button>
  );
}

const MINE = '#e4c36a';
const THEIRS = '#b5633a';

/** One square. The number is always readable; the fill carries the meaning. */
function DayDot({
  day,
  state,
  inMonth,
  status,
}: {
  day: string;
  state: DayState;
  inMonth: boolean;
  status: DayStatus;
}) {
  const n = Number(day.slice(8));
  const half = state === 'partial';
  // Split circle: his side and hers, so a broken day says whose it was without
  // anybody having to open it.
  const mineIn =
    status.mine.required > 0 && status.mine.done === status.mine.required;
  const theirsIn =
    status.theirs.required > 0 && status.theirs.done === status.theirs.required;

  return (
    <span className="relative z-[1] flex flex-col items-center">
      <span
        className={cn(
          'grid h-[26px] w-[26px] place-items-center rounded-full font-sans text-[11px] tabular-nums',
          state === 'complete' && 'font-bold text-bg',
          state !== 'complete' && (inMonth ? 'text-fg/70' : 'text-fg/25')
        )}
        style={
          state === 'complete'
            ? { background: 'linear-gradient(150deg, #e4c36a, #b8912f)' }
            : half
              ? {
                  background: `linear-gradient(90deg, ${mineIn ? MINE : 'transparent'} 50%, ${theirsIn ? THEIRS : 'transparent'} 50%)`,
                  border: '1px solid rgba(228,195,106,.2)',
                }
              : state === 'open'
                ? { border: '1.5px dashed rgba(228,195,106,.55)' }
                : state === 'missed'
                  ? { border: '1px solid rgba(251,245,240,.09)' }
                  : undefined
        }
      >
        {n}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'mt-[2px] h-[3px] w-[3px] rounded-full',
          status.shared ? 'bg-gold/80' : 'bg-transparent'
        )}
      />
    </span>
  );
}
