import { DateTime } from 'luxon';
import { GRACE_HOUR } from './goals';

/**
 * Her day, and the three hours after it.
 *
 * The Five is the one thing in this app that is not generous about time. The
 * polaroid lets you borrow the other clock; the streak lets you fix yesterday
 * while Curicó catches up. Here, a day she can back-fill is a diary, and a diary
 * proves nothing - so her window is her own day plus a grace period until 3AM
 * the next morning, for the nights she taps in bed and the mornings she answers
 * for the night before.
 *
 * His window is every day there has ever been. He is the one who finds out over
 * a call that a tap was generous, and he is the one paying for it either way.
 *
 * The database enforces exactly this (`five_guard_window`); these functions
 * mirror it so the screen never offers a day the server will refuse, and never
 * greys out one it would accept. A null zone falls back to UTC, never the host
 * zone - a build running in UTC must not quietly disagree with a phone.
 */

/** The civil date in a zone right now, as 'YYYY-MM-DD'. */
export function localDay(
  zone: string | null | undefined,
  now: DateTime = DateTime.now()
): string {
  return now.setZone(zone ?? 'UTC').toISODate() ?? now.toUTC().toISODate()!;
}

/** Day arithmetic on the label itself, anchored to UTC so no zone shifts it. */
export function addDays(day: string, n: number): string {
  return DateTime.fromISO(`${day}T00:00:00Z`, { zone: 'utc' })
    .plus({ days: n })
    .toISODate()!;
}

/**
 * The instant `day` stops being correctable for her: 3AM the morning after, on
 * her own wall clock.
 *
 * Asked as a wall-clock time on the following date, not as "the day's start plus
 * 27 hours". The two differ on the nights a zone changes its clocks - Chile
 * moves at midnight, so a naive +1 day +3h lands at 04:00 once a year - and the
 * promise made on the screen is "until 3 in the morning", which is a reading on
 * a clock. If a zone ever abolishes 3AM itself, luxon moves forward to the next
 * real minute, which is the right way to be wrong here: it errs long.
 *
 * The database computes the same instant the same way (`five_guard_window`).
 */
export function closesAt(
  day: string,
  zone: string | null | undefined
): DateTime {
  const pad = String(GRACE_HOUR).padStart(2, '0');
  return DateTime.fromISO(`${addDays(day, 1)}T${pad}:00:00`, {
    zone: zone ?? 'UTC',
  });
}

/** How long she has left on `day`, in milliseconds. Negative once it is shut. */
export function msLeft(
  day: string,
  zone: string | null | undefined,
  now: DateTime = DateTime.now()
): number {
  return closesAt(day, zone).toMillis() - now.toMillis();
}

/**
 * May this person still change this day?
 *
 * Three answers folded into one boolean, in the order they matter: a day that
 * has not happened is nobody's to tick, his days never close, and hers close at
 * 3AM. `isKeeper` is him - the admin - and it is the only privilege in here.
 */
export function canMark(
  day: string,
  zone: string | null | undefined,
  isKeeper: boolean,
  now: DateTime = DateTime.now()
): boolean {
  if (day > localDay(zone, now)) return false;
  if (isKeeper) return true;
  return msLeft(day, zone, now) > 0;
}

/**
 * The days her screen opens on: today, and yesterday while the grace window is
 * still open. Newest first, so the first row is the one she came to tap.
 */
export function liveDays(
  zone: string | null | undefined,
  now: DateTime = DateTime.now()
): string[] {
  const today = localDay(zone, now);
  const yesterday = addDays(today, -1);
  return msLeft(yesterday, zone, now) > 0 ? [today, yesterday] : [today];
}

/** The last `n` days ending today, newest first - the strip under the pots. */
export function recentDays(
  zone: string | null | undefined,
  n: number,
  now: DateTime = DateTime.now()
): string[] {
  const today = localDay(zone, now);
  return Array.from({ length: n }, (_, i) => addDays(today, -i));
}

/** 'Thursday' / 'Today' / 'Yesterday', for a heading that reads like speech. */
export function dayName(
  day: string,
  zone: string | null | undefined,
  now: DateTime = DateTime.now()
): string {
  const today = localDay(zone, now);
  if (day === today) return 'Today';
  if (day === addDays(today, -1)) return 'Yesterday';
  return DateTime.fromISO(`${day}T12:00:00Z`, { zone: 'utc' }).toFormat(
    'cccc d LLL'
  );
}
