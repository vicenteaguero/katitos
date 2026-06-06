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
