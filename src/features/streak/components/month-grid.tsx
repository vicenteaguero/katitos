import type { CSSProperties } from 'react';
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
        {days.map((day, i) => {
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
                // A run that carries on into the next row still needs a
                // rounded end at the edge of this one, or it trails a square
                // stub into the margin.
                run &&
                  (i % 7 === 0 || !isRun(addDays(day, -1))) &&
                  'cal-run--start',
                run &&
                  (i % 7 === 6 || !isRun(addDays(day, 1))) &&
                  'cal-run--end',
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

/** How every state is painted, in one place. The legend reads from here too. */
function dotStyle(state: DayState): CSSProperties | undefined {
  switch (state) {
    case 'complete':
      return { background: 'linear-gradient(150deg, #e4c36a, #b8912f)' };
    case 'open':
      return { border: '1.5px dashed rgba(228,195,106,.55)' };
    case 'missed':
      return { border: '1px solid rgba(251,245,240,.09)' };
    default:
      return undefined;
  }
}

/**
 * The same circle the calendar draws, small, for the key underneath it.
 *
 * It renders through `dotStyle` and `SplitRing` rather than approximating them,
 * because a hand-drawn legend is a legend that quietly stops being true.
 */
export function StateSwatch({ state }: { state: DayState }) {
  return (
    <span
      className="relative grid h-[15px] w-[15px] shrink-0 place-items-center rounded-full"
      style={dotStyle(state)}
      aria-hidden="true"
    >
      {state === 'partial' && <SplitRing mine theirs={false} size={15} />}
    </span>
  );
}

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
  const mineIn =
    status.mine.required > 0 && status.mine.done === status.mine.required;
  const theirsIn =
    status.theirs.required > 0 && status.theirs.done === status.theirs.required;

  return (
    <span className="relative z-[1] flex flex-col items-center">
      <span
        className={cn(
          'relative grid h-[26px] w-[26px] place-items-center rounded-full font-sans text-[11px] tabular-nums',
          state === 'complete' && 'font-bold text-bg',
          state === 'before' && 'text-fg/20',
          state !== 'complete' &&
            state !== 'before' &&
            (inMonth ? 'text-fg/80' : 'text-fg/25')
        )}
        style={dotStyle(state)}
      >
        {state === 'partial' && <SplitRing mine={mineIn} theirs={theirsIn} />}
        <span className="relative">{n}</span>
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

/**
 * A day one of us finished and the other did not.
 *
 * Drawn as two half arcs around the number rather than as two solid halves
 * behind it: filling the disc put warm snow on top of gilt, and the date was
 * the one thing on the square you could not read.
 */
function SplitRing({
  mine,
  theirs,
  size = 26,
}: {
  mine: boolean;
  theirs: boolean;
  size?: number;
}) {
  const TRACK = 'rgba(251,245,240,.1)';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 26 26"
      className="absolute inset-0"
      aria-hidden="true"
    >
      {/* Left is his side, right is hers - the same order as everywhere else. */}
      <path
        d="M 13 1.25 A 11.75 11.75 0 0 0 13 24.75"
        fill="none"
        stroke={mine ? MINE : TRACK}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M 13 1.25 A 11.75 11.75 0 0 1 13 24.75"
        fill="none"
        stroke={theirs ? THEIRS : TRACK}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
