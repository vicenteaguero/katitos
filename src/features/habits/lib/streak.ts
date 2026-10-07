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
  title: string;
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

/**
 * How many habits he may ask of her.
 *
 * `habits_guard()` parks hers in slots 5 to 9 and refuses a sixth, so this is
 * the database's number, not the screen's. The screen only needs it to stop
 * offering a button that would be refused.
 */
export const MAX_HERS = 5;

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
  /**
   * The day keeps the streak: his habits and the call all ticked, and hers at
   * `HER_FLOOR` or better, or on her cheat day.
   */
  complete: boolean;
  /**
   * Hers fell short and this is the first such day of its week: her side is
   * forgiven and no money moves, whatever the rest of the day did.
   */
  cheat: boolean;
  /** Nothing at all was ticked. */
  empty: boolean;
}

/** How many of hers keep a day. All of them, if she has fewer. */
export const HER_FLOOR = 3;

/** Her daily habits on one day, as required and held. */
function herSide(
  day: string,
  habits: readonly HabitLike[],
  done: DoneSet,
  subjectId: string
): SideStatus {
  const side: SideStatus = { required: 0, done: 0 };
  for (const h of habits) {
    if (h.schedule !== 'daily' || h.kind !== 'personal') continue;
    if (h.user_id !== subjectId || !activeOn(h, day)) continue;
    side.required += 1;
    if (done.has(tickKey(h.id, day))) side.done += 1;
  }
  return side;
}

/** Did her side fall short of the floor? A day with none of hers never does. */
export function isShort(side: SideStatus): boolean {
  return side.required > 0 && side.done < Math.min(HER_FLOOR, side.required);
}

/**
 * The day her five started. Nothing before it is a cheat day, and nothing
 * before it uses one up. `public.habit_rule_from()` holds the same date.
 */
export const CHEAT_FROM = '2026-09-26';

/**
 * Her cheat day: the first short day of its Monday-to-Sunday week.
 *
 * It keeps the streak and moves no money. A second short day in the same week
 * is an ordinary miss. `public.habit_cheat_day()` is the database's copy.
 */
export function isCheatDay(
  day: string,
  habits: readonly HabitLike[],
  done: DoneSet,
  subjectId: string | null | undefined
): boolean {
  if (!subjectId || day < CHEAT_FROM) return false;
  if (!isShort(herSide(day, habits, done, subjectId))) return false;
  for (const d of weekDays(day)) {
    if (d >= day) break;
    if (d < CHEAT_FROM) continue;
    if (isShort(herSide(d, habits, done, subjectId))) return false;
  }
  return true;
}

/**
 * What happened on one day.
 *
 * Weekly habits are absent on purpose: they cannot break a single day, only the
 * week they end short. See `weekVerdict`.
 *
 * `subjectId` is her: the one whose habits keep a day at three. Without it every
 * daily habit has to be ticked.
 */
export function dayStatus(
  day: string,
  habits: readonly HabitLike[],
  done: DoneSet,
  selfId: string | null,
  partnerId: string | null,
  subjectId?: string | null
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
    // Hers are judged as a side, below.
    const isHers =
      !!subjectId && h.kind === 'personal' && h.user_id === subjectId;
    if (!ticked && !isHers) complete = false;

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

  let cheat = false;
  if (subjectId && isShort(herSide(day, habits, done, subjectId))) {
    cheat = isCheatDay(day, habits, done, subjectId);
    if (!cheat) complete = false;
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
    cheat,
    empty,
  };
}

export type WeekVerdict = 'ok' | 'pending' | 'failed';

export interface WeeklyProgress {
  habit: HabitLike;
  done: number;
  target: number;
  met: boolean;
  /** Days of this week you could still tick it on. */
  left: number;
  /** False once the count can no longer be reached, however hard you try. */
  possible: boolean;
}

/** How far along a weekly habit is in the week containing `day`. */
export function weeklyProgress(
  h: HabitLike,
  day: string,
  done: DoneSet,
  selfZone?: string | null,
  partnerZone?: string | null,
  now?: DateTime
): WeeklyProgress {
  const days = weekDays(day).filter((d) => activeOn(h, d));
  const hit = days.filter((d) => done.has(tickKey(h.id, d))).length;
  const left = days.filter(
    (d) =>
      !done.has(tickKey(h.id, d)) && !isSettled(d, selfZone, partnerZone, now)
  ).length;
  return {
    habit: h,
    done: hit,
    target: h.target_per_week,
    met: hit >= h.target_per_week,
    left,
    possible: hit + left >= h.target_per_week,
  };
}

/**
 * The week, as a whole.
 *
 * 'ok'      every weekly habit made its count.
 * 'failed'  one of them can no longer reach it - the streak stops here.
 * 'pending' still reachable, still short. Its days are real but not yet
 *           banked: they show as "at stake", never as a loss.
 */
export function weekVerdict(
  day: string,
  habits: readonly HabitLike[],
  done: DoneSet,
  selfZone: string | null | undefined,
  partnerZone: string | null | undefined,
  now?: DateTime
): WeekVerdict {
  const days = weekDays(day);
  let verdict: WeekVerdict = 'ok';

  for (const h of habits) {
    if (h.schedule !== 'weekly') continue;

    // The week you add a habit - or put it away - is a free week. Promise three
    // gym days on a Saturday and only two days of that week exist: asking for
    // three is asking for something nobody could have done, and a streak lost
    // to arithmetic is the fastest way to stop believing the number.
    if (!days.every((d) => activeOn(h, d))) continue;

    const p = weeklyProgress(h, day, done, selfZone, partnerZone, now);
    if (p.met) continue;

    // Out of reach. This covers the week that closed short, because a closed
    // week has no days left to win - and it covers the Saturday you notice you
    // have done none of three, which is exactly as lost and should say so then
    // rather than wait until Sunday night to break the news.
    if (!p.possible) return 'failed';

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
  /** Her, whose habits keep a day at three. */
  subjectId?: string | null;
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
    subjectId,
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

    const status = dayStatus(day, habits, done, selfId, partnerId, subjectId);
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
  furthest: string,
  subjectId?: string | null
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
    if (dayStatus(day, habits, done, selfId, partnerId, subjectId).complete) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}
