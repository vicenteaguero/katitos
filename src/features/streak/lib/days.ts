import { DateTime } from 'luxon';
import { addDays, dayGap, weekStartOf } from '@kernel/lib';

/**
 * Drawing the calendar.
 *
 * The rules about which day is still yours to change moved to
 * `src/kernel/lib/habit-days.ts`, because the Five reads them too and a window
 * that exists twice is a window that will one day disagree with itself. What is
 * left here is how a month is laid out on screen.
 */

export {
  localDay,
  addDays,
  dayGap as daysBetween,
  furthestDay,
  nearestDay,
  isDayOpen,
  isSettled,
} from '@kernel/lib';

/** The Monday of the week a day belongs to. Weeks run Monday to Sunday. */
export const weekStart = weekStartOf;

/** The seven labels of the week a day belongs to. */
export function weekDays(day: string): string[] {
  const monday = weekStart(day);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** 'YYYY-MM' for a day. */
export function monthOf(day: string): string {
  return day.slice(0, 7);
}

/** Shift a 'YYYY-MM' by whole months. */
export function addMonths(month: string, n: number): string {
  return DateTime.fromISO(`${month}-01T00:00:00Z`, { zone: 'utc' })
    .plus({ months: n })
    .toFormat('yyyy-MM');
}

/**
 * The month as it is drawn: whole weeks, Monday first, so every column is one
 * weekday and the streak ribbon can run along a row without a gap.
 */
export function monthGrid(month: string): string[] {
  const first = `${month}-01`;
  const start = weekStart(first);
  const last = DateTime.fromISO(`${first}T00:00:00Z`, { zone: 'utc' })
    .endOf('month')
    .toISODate()!;
  const end = addDays(weekStart(last), 6);
  const span = dayGap(start, end) + 1;
  return Array.from({ length: span }, (_, i) => addDays(start, i));
}
