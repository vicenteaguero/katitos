import { DateTime } from 'luxon';

/**
 * The calendar, as the two of us actually live it.
 *
 * In the kernel because it is not one feature's rule any more: the streak, the
 * Five and anything else that asks "is this day still mine to change" have to
 * agree to the minute, and two copies of a window is two answers to the same
 * question.
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

/**
 * How many days from `a` to `b`, negative if `b` is earlier.
 *
 * Named apart from `datetime.ts`'s `daysBetween`, which takes real instants and
 * measures them in the host zone. This one works on the LABELS - '2026-09-07' -
 * anchored to UTC, so no zone can shift the answer by a day.
 */
export function dayGap(a: string, b: string): number {
  return Math.round(
    (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000
  );
}

/** The clock ahead: nothing past this date has happened for either of us. */
export function furthestDay(
  selfZone: string | null | undefined,
  partnerZone: string | null | undefined,
  now: DateTime = DateTime.now()
): string {
  const a = localDay(selfZone, now);
  const b = localDay(partnerZone, now);
  return a > b ? a : b;
}

/** The clock behind - the one that closes a day for good. */
export function nearestDay(
  selfZone: string | null | undefined,
  partnerZone: string | null | undefined,
  now: DateTime = DateTime.now()
): string {
  const a = localDay(selfZone, now);
  const b = localDay(partnerZone, now);
  return a < b ? a : b;
}

/**
 * Can I still tick this day?
 *
 * Never the future, and never once the day AFTER it has ended on the clock
 * behind. She can still fill her Saturday while it is Sunday in Curicó,
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
    addDays(day, 1) >= nearestDay(selfZone, partnerZone, now)
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
  return addDays(day, 1) < nearestDay(selfZone, partnerZone, now);
}

/** The Monday of the week a day belongs to. Weeks run Monday to Sunday. */
export function weekStartOf(day: string): string {
  const dt = DateTime.fromISO(`${day}T00:00:00Z`, { zone: 'utc' });
  return dt.minus({ days: dt.weekday - 1 }).toISODate()!;
}
