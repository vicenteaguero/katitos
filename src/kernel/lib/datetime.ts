import { DateTime, Duration } from 'luxon';

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
  totalSeconds: number;
}

/** Break the time between now and a target into d/h/m/s. */
export function countdownTo(
  target: string | Date | DateTime,
  now: DateTime = DateTime.now()
): CountdownParts {
  const end =
    target instanceof DateTime
      ? target
      : DateTime.fromJSDate(target instanceof Date ? target : new Date(target));
  const diff = end.diff(now);
  const totalSeconds = Math.floor(diff.as('seconds'));
  const isPast = totalSeconds < 0;
  const dur = Duration.fromMillis(Math.abs(diff.toMillis())).shiftTo(
    'days',
    'hours',
    'minutes',
    'seconds'
  );
  return {
    days: Math.floor(dur.days),
    hours: Math.floor(dur.hours),
    minutes: Math.floor(dur.minutes),
    seconds: Math.floor(dur.seconds),
    isPast,
    totalSeconds,
  };
}

export interface DurationParts {
  years: number;
  months: number;
  weeks: number;
  days: number;
}

/**
 * Decompose the span since a start date into calendar years / months / weeks /
 * days (each unit the whole remainder of the larger ones). For the "together
 * for N days" hero — the big number stays total days; this is the breakdown.
 */
export function durationBreakdown(
  startDate: string | Date | null | undefined,
  now: DateTime = DateTime.now()
): DurationParts {
  if (!startDate) return { years: 0, months: 0, weeks: 0, days: 0 };
  const start = DateTime.fromJSDate(new Date(startDate)).startOf('day');
  const diff = now
    .startOf('day')
    .diff(start, ['years', 'months', 'weeks', 'days'])
    .toObject();
  return {
    years: Math.max(0, Math.floor(diff.years ?? 0)),
    months: Math.max(0, Math.floor(diff.months ?? 0)),
    weeks: Math.max(0, Math.floor(diff.weeks ?? 0)),
    days: Math.max(0, Math.floor(diff.days ?? 0)),
  };
}

/** Whole days between two dates (date-only, ignores time). */
export function daysBetween(
  start: string | Date,
  end: string | Date = new Date()
): number {
  const a = DateTime.fromJSDate(new Date(start)).startOf('day');
  const b = DateTime.fromJSDate(new Date(end)).startOf('day');
  return Math.floor(b.diff(a, 'days').days);
}

/** Days the couple has been together (>= 0). */
export function daysTogether(
  startDate: string | Date | null | undefined
): number {
  if (!startDate) return 0;
  return Math.max(0, daysBetween(startDate, new Date()));
}

/**
 * The hour it started: about 3 a.m. on 15 June 2025, Novosibirsk time.
 *
 * A constant, deliberately. This used to be read from `couple.relationship_
 * start_date`, which meant the number on the home screen was the result of a
 * network round-trip — and until it landed, `daysTogether(undefined)` returned
 * **0**, so the first thing the screen said was that we had been together for
 * no days at all. Nothing about this figure needs a database: it is one
 * subtraction, and the answer is the same on both our phones.
 */
export const TOGETHER_START_ISO = '2025-06-15T03:00:00+07:00';

/**
 * Whole days since it started — instant, offline, no query.
 *
 * Counted as elapsed time rather than calendar dates, so it rolls over at 3
 * a.m. in Novosibirsk wherever either of us is standing, and the two phones
 * never disagree. Both sides of the subtraction are instants, so no timezone
 * conversion is involved at all.
 */
export function daysTogetherNow(now: DateTime = DateTime.now()): number {
  const start = DateTime.fromISO(TOGETHER_START_ISO);
  return Math.max(0, Math.floor(now.diff(start, 'days').days));
}

/**
 * The next monthsversary (e.g. the 15th). Returns the upcoming occurrence,
 * including today if today is the day.
 */
export function nextMonthsversary(
  day = 15,
  now: DateTime = DateTime.now()
): DateTime {
  const clampDay = (dt: DateTime) => Math.min(day, dt.daysInMonth ?? 28);
  let candidate = now.set({ day: clampDay(now) }).startOf('day');
  if (candidate < now.startOf('day')) {
    const nm = now.plus({ months: 1 });
    candidate = nm.set({ day: clampDay(nm) }).startOf('day');
  }
  return candidate;
}

/** How many whole monthsversaries since the start date. */
export function monthsversaryCount(
  startDate: string | Date,
  now: DateTime = DateTime.now()
): number {
  const start = DateTime.fromJSDate(new Date(startDate));
  const months = Math.floor(now.diff(start, 'months').months);
  return Math.max(0, months);
}

export function formatDate(value: string | Date, fmt = 'DDD'): string {
  return DateTime.fromJSDate(new Date(value)).toFormat(fmt);
}

export function formatDateTime(value: string | Date): string {
  return DateTime.fromJSDate(new Date(value)).toLocaleString(
    DateTime.DATETIME_MED
  );
}

/** Relative phrase like "3 days ago" / "in 2 hours". */
export function relativeTime(value: string | Date): string {
  return DateTime.fromJSDate(new Date(value)).toRelative() ?? '';
}

/** Current time in a given IANA zone, formatted. */
export function timeInZone(
  zone: string,
  now: DateTime = DateTime.now()
): string {
  return now.setZone(zone).toFormat('HH:mm');
}

/** Offset in hours between two IANA zones (b relative to a). */
export function zoneOffsetHours(
  zoneA: string,
  zoneB: string,
  now: DateTime = DateTime.now()
): number {
  const a = now.setZone(zoneA).offset;
  const b = now.setZone(zoneB).offset;
  return (b - a) / 60;
}

export { DateTime };
