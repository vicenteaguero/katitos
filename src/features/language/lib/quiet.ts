import { DateTime } from 'luxon';

/** Nobody wants a buzz at three in the morning: 23:00 → 08:00, their time. */
export const QUIET_FROM = 23;
export const QUIET_UNTIL = 8;

/**
 * Is it night where they are?
 *
 * Eleven time zones apart, her "just marked it" is his three in the
 * morning half the time. A push held back is not lost — the thing it was
 * about is on the home screen when he wakes. An unknown zone never holds
 * anything back: better one buzz at night than a lesson that never arrives.
 */
export function isAsleep(
  zone: string | null | undefined,
  now: DateTime = DateTime.now()
): boolean {
  if (!zone) return false;
  const hour = now.setZone(zone).hour;
  return hour >= QUIET_FROM || hour < QUIET_UNTIL;
}

/** "02:40" — what their clock says right now. */
export function clockIn(
  zone: string | null | undefined,
  now: DateTime = DateTime.now()
): string | null {
  if (!zone) return null;
  const t = now.setZone(zone);
  return t.isValid ? t.toFormat('HH:mm') : null;
}
