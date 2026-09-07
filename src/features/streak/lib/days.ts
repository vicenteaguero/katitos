import { DateTime } from 'luxon';

/**
 * The calendar, as the two of us actually live it.
 *
 * A day here is a plain label - '2026-09-07' - and both of us point at the same
 * label when we say "Saturday". What differs is the eleven hours: her Saturday
 * starts and ends long before his. So the label is shared and the *window* is
 * not, and every function below is about that window.
 *
 * A null/unknown zone falls back to UTC, never the host zone - otherwise a
 * server build (UTC) would quietly disagree with a phone.
 */

/** The civil date in a zone right now, as 'YYYY-MM-DD'. */
export function localDay(
  zone: string | null | undefined,
  now: DateTime = DateTime.now()
): string {
  return now.setZone(zone ?? 'UTC').toISODate() ?? now.toUTC().toISODate()!;
}

/** Day arithmetic on the label itself, anchored to UTC so no zone can shift it. */
export function addDays(day: string, n: number): string {
  return DateTime.fromISO(`${day}T00:00:00Z`, { zone: 'utc' })
    .plus({ days: n })
    .toISODate()!;
}

/** How many days from `a` to `b`, negative if `b` is earlier. */
export function daysBetween(a: string, b: string): number {
  return Math.round(
    (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000
  );
}

/** The later of our two wall clocks - the one that closes a day for good. */
export function furthestDay(
  selfZone: string | null | undefined,
  partnerZone: string | null | undefined,
  now: DateTime = DateTime.now()
): string {
  const a = localDay(selfZone, now);
  const b = localDay(partnerZone, now);
  return a > b ? a : b;
}

/**
 * Can I still tick this day?
 *
 * Never the future, and never once the day AFTER it has ended on the later of
 * our two clocks. She can still fill her Saturday while it is Sunday in Curicó,
 * and that is the whole point: what kills a streak is not a missed habit, it is
 * a habit you did and forgot to tick.
 */
export function isDayOpen(
  day: string,
  selfZone: string | null | undefined,
  partnerZone: string | null | undefined,
  now: DateTime = DateTime.now()
): boolean {
  return (
    day <= localDay(selfZone, now) &&
    addDays(day, 1) >= furthestDay(selfZone, partnerZone, now)
  );
}

/**
 * Is this day final? A settled day can never change again, for either of us -
 * so it is the only kind of day allowed to break a streak.
 */
export function isSettled(
  day: string,
  selfZone: string | null | undefined,
  partnerZone: string | null | undefined,
  now: DateTime = DateTime.now()
): boolean {
  return addDays(day, 1) < furthestDay(selfZone, partnerZone, now);
}

/** The Monday of the week a day belongs to. Weeks run Monday to Sunday. */
export function weekStart(day: string): string {
  const dt = DateTime.fromISO(`${day}T00:00:00Z`, { zone: 'utc' });
  return dt.minus({ days: dt.weekday - 1 }).toISODate()!;
}

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
  const span = daysBetween(start, end) + 1;
  return Array.from({ length: span }, (_, i) => addDays(start, i));
}
