import { DateTime } from 'luxon';
import { addDays, isDayOpen, isSettled, localDay } from '@kernel/lib';

/**
 * Which days of hers are still hers to change.
 *
 * There is one window now, and it is the streak's: a day stays open until the
 * day after it has ended on the clock behind, because what kills a run is not a
 * missed habit, it is a habit you did and forgot to tick. The Five used to shut
 * at 3AM on her own clock, which was a second answer to the same question, and
 * the Five and the streak are not two things - the same tap writes the same row.
 * The wider rule won, which is also the direction the grace period was asked for
 * in.
 *
 * So everything here delegates to `@kernel/lib`, and what is left is the two
 * questions only this screen asks: which days to put a card on, and what to call
 * them.
 *
 * His window is every day that has happened. He is the one who finds out over a
 * call that a tap was generous, and he is paying either way.
 */

export { addDays, localDay } from '@kernel/lib';

/**
 * May this person still change this day?
 *
 * Three answers folded into one boolean, in the order they matter: a day nobody
 * has lived is nobody's to tick, his days never close, and hers close when the
 * streak says so. `isKeeper` is him, and it is the only privilege in here.
 */
export function canMark(
  day: string,
  zone: string | null | undefined,
  partnerZone: string | null | undefined,
  isKeeper: boolean,
  now: DateTime = DateTime.now()
): boolean {
  if (day > localDay(zone, now)) return false;
  if (isKeeper) return true;
  return isDayOpen(day, zone, partnerZone, now);
}

/** Is this day final for both of them, and so ready for the money? */
export function isClosed(
  day: string,
  zone: string | null | undefined,
  partnerZone: string | null | undefined,
  now: DateTime = DateTime.now()
): boolean {
  return isSettled(day, zone, partnerZone, now);
}

/**
 * The days her screen opens on: today, and yesterday while it is still open.
 * Newest first, so the first card is the one she came to tap.
 */
export function liveDays(
  zone: string | null | undefined,
  partnerZone: string | null | undefined,
  now: DateTime = DateTime.now()
): string[] {
  const today = localDay(zone, now);
  const yesterday = addDays(today, -1);
  return isDayOpen(yesterday, zone, partnerZone, now)
    ? [today, yesterday]
    : [today];
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
