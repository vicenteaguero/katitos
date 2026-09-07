import { type DateTime } from 'luxon';
import { addDays, isSettled, weekDays, weekStart } from './days';

/**
 * The rules of the streak, as pure functions over rows.
 *
 * Everything the screen shows comes from here, so the number in the widget, the
 * colour of a calendar square and the reason a slot is locked can never drift
 * apart. The database has its own, deliberately looser copy of the streak
 * (`public.streak_days()`); the comment at the top of the migration explains why
 * that one is the floor and this one is the truth.
 */

export interface HabitLike {
  id: string;
  user_id: string | null;
  kind: string;
  schedule: string;
  target_per_week: number;
  effective_from: string;
  archived_at: string | null;
}

/** A tick, as `${habit_id}:${day}`. */
export type DoneSet = ReadonlySet<string>;

export function tickKey(habitId: string, day: string): string {
  return `${habitId}:${day}`;
}

/** Slot n needs this many days of streak before it can be filled. */
export const SLOT_THRESHOLDS = [0, 7, 14, 21] as const;
export const MAX_SLOTS = SLOT_THRESHOLDS.length;

/** How many personal habits a streak entitles you to. */
export function slotsAllowed(streak: number): number {
  return SLOT_THRESHOLDS.filter((t) => streak >= t).length;
}

/**
 * May you take another one on?
 *
 * What a streak buys is a NUMBER of habits, not a particular slot. Put the
 * second of four away while the streak is down and you still hold three, so the
 * next one you add is a fourth and costs a fourth's streak - otherwise emptying
 * a slot would be a way of buying a cheap one back.
 */
export function canAddHabit(streak: number, live: number): boolean {
  return live < slotsAllowed(streak);
}

/** Days of streak still to go before the next empty slot opens, or null at the top. */
export function daysToNextSlot(
  streak: number,
  liveHabits: number
): number | null {
  if (liveHabits >= MAX_SLOTS) return null;
  const need = SLOT_THRESHOLDS[liveHabits];
  return Math.max(0, need - streak);
}

/**
 * Was this habit in force on this day?
 *
 * `effective_from` is why adding a habit at 23:50 cannot cost you tonight, and
 * `archived_at` is why putting one away does not retroactively fail every day
 * you already lived.
 */
export function activeOn(h: HabitLike, day: string): boolean {
  if (day < h.effective_from) return false;
  if (h.archived_at && day >= h.archived_at.slice(0, 10)) return false;
  return true;
}

export interface SideStatus {
  required: number;
  done: number;
}

export interface DayStatus {
  day: string;
  /** The shared habit - did we talk. Null when there was no shared habit yet. */
  shared: boolean | null;
  mine: SideStatus;
  theirs: SideStatus;
  /** Everything daily that was due that day is ticked. */
  complete: boolean;
  /** Nothing at all was ticked. */
  empty: boolean;
}

/**
 * What happened on one day.
 *
 * Weekly habits are absent on purpose: they cannot break a single day, only the
 * week they end short. See `weekVerdict`.
 */
export function dayStatus(
  day: string,
  habits: readonly HabitLike[],
  done: DoneSet,
  selfId: string | null,
  partnerId: string | null
): DayStatus {
  const mine: SideStatus = { required: 0, done: 0 };
  const theirs: SideStatus = { required: 0, done: 0 };
  let shared: boolean | null = null;
  let required = 0;
  let complete = true;

  for (const h of habits) {
    if (h.schedule !== 'daily' || !activeOn(h, day)) continue;
    required += 1;
    const ticked = done.has(tickKey(h.id, day));
    if (!ticked) complete = false;

    if (h.kind === 'shared') {
      shared = ticked;
      continue;
    }
    const side =
      h.user_id === selfId ? mine : h.user_id === partnerId ? theirs : null;
    if (!side) continue;
    side.required += 1;
    if (ticked) side.done += 1;
  }

  const empty = !shared && mine.done === 0 && theirs.done === 0;
  // A day nobody had a habit on is not a day we kept: it is a day before the
  // streak existed. Counting it would have made every date since the epoch
  // vacuously perfect.
  return {
    day,
    shared,
    mine,
    theirs,
    complete: complete && required > 0,
    empty,
  };
}

export type WeekVerdict = 'ok' | 'pending' | 'failed';

export interface WeeklyProgress {
  habit: HabitLike;
  done: number;
  target: number;
  met: boolean;
}

/** How far along a weekly habit is in the week containing `day`. */
export function weeklyProgress(
  h: HabitLike,
  day: string,
  done: DoneSet
): WeeklyProgress {
  const days = weekDays(day).filter((d) => activeOn(h, d));
  const hit = days.filter((d) => done.has(tickKey(h.id, d))).length;
  return {
    habit: h,
    done: hit,
    target: h.target_per_week,
    met: hit >= h.target_per_week,
  };
}

/**
 * The week, as a whole.
 *
 * 'ok'      every weekly habit made its count.
 * 'failed'  the week is over and one of them did not - the streak stops here.
 * 'pending' the week is still running and one of them is short. Its days are
 *           real but not yet banked: they show as "at stake", never as a loss.
 */
export function weekVerdict(
  day: string,
  habits: readonly HabitLike[],
  done: DoneSet,
  selfZone: string | null | undefined,
  partnerZone: string | null | undefined,
  now?: DateTime
): WeekVerdict {
  const sunday = addDays(weekStart(day), 6);
  const over = isSettled(sunday, selfZone, partnerZone, now);
  let verdict: WeekVerdict = 'ok';

  for (const h of habits) {
    if (h.schedule !== 'weekly') continue;
    // A week the habit did not span for its full length is not a fair test.
    if (!weekDays(day).some((d) => activeOn(h, d))) continue;
    if (weeklyProgress(h, day, done).met) continue;
    if (over) return 'failed';
    verdict = 'pending';
  }
  return verdict;
}

export interface StreakResult {
  /** Days banked. This is the number on the card. */
  days: number;
  /** Days lived but held back by a week whose weekly habit is still short. */
  atStake: number;
  /** The day the run starts on, for drawing the ribbon. Null when there is none. */
  from: string | null;
}

export interface StreakInput {
  habits: readonly HabitLike[];
  done: DoneSet;
  selfId: string | null;
  partnerId: string | null;
  selfZone: string | null | undefined;
  partnerZone: string | null | undefined;
  /** The later of our two clocks - where the walk starts. */
  furthest: string;
  now?: DateTime;
}

const WALK_LIMIT = 3650;

/**
 * How many days in a row.
 *
 * Walks back from the furthest-ahead clock. A day that is still open and still
 * incomplete is skipped, not counted against us - it is in progress, and
 * treating it as a miss would show the streak dying every morning before
 * breakfast. The first *settled* incomplete day is where the run ends.
 */
export function computeStreak(input: StreakInput): StreakResult {
  const {
    habits,
    done,
    selfId,
    partnerId,
    selfZone,
    partnerZone,
    furthest,
    now,
  } = input;

  const earliest = habits.reduce<string | null>(
    (min, h) =>
      min === null || h.effective_from < min ? h.effective_from : min,
    null
  );
  if (!earliest) return { days: 0, atStake: 0, from: null };

  const weeks = new Map<string, WeekVerdict>();
  const verdictFor = (day: string): WeekVerdict => {
    const key = weekStart(day);
    let v = weeks.get(key);
    if (v === undefined) {
      v = weekVerdict(day, habits, done, selfZone, partnerZone, now);
      weeks.set(key, v);
    }
    return v;
  };

  let day = furthest;
  let days = 0;
  let atStake = 0;
  let from: string | null = null;

  for (let i = 0; i < WALK_LIMIT && day >= earliest; i++) {
    const week = verdictFor(day);
    if (week === 'failed') break;

    const status = dayStatus(day, habits, done, selfId, partnerId);
    if (status.complete) {
      if (week === 'pending') atStake += 1;
      else days += 1;
      from = day;
    } else if (!isSettled(day, selfZone, partnerZone, now)) {
      // Still open. Neither banked nor broken.
    } else {
      break;
    }
    day = addDays(day, -1);
  }

  return { days, atStake, from };
}

/** The longest run ever, for the quiet line under the big number. */
export function longestStreak(
  habits: readonly HabitLike[],
  done: DoneSet,
  selfId: string | null,
  partnerId: string | null,
  furthest: string
): number {
  const earliest = habits.reduce<string | null>(
    (min, h) =>
      min === null || h.effective_from < min ? h.effective_from : min,
    null
  );
  if (!earliest) return 0;

  let best = 0;
  let run = 0;
  for (let day = earliest; day <= furthest; day = addDays(day, 1)) {
    if (dayStatus(day, habits, done, selfId, partnerId).complete) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}
