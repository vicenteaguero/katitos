/**
 * The knobs the Habits clock turns, in one place.
 *
 * Kept here rather than in the function body because these are decisions, not
 * implementation: the day the nudges are switched on, the line that does it
 * should be findable by someone who is not reading a 500-line scheduler.
 */

/**
 * Are her habit nudges switched on?
 *
 * Five random reminders a day is a lot to hand someone without warning, so this
 * stays false until he has told her they are coming. Everything else the clock
 * does - the streak's two nudges, settling the day, noticing a silent stretch -
 * runs either way; this flag only gates the new ones.
 */
export const NUDGES_ON = false;

/** The hours a nudge may land in, on her clock: 07:00 to 23:59. */
export const DAY_FROM = 7;
export const DAY_TO = 23.98;

/**
 * What a nudge says.
 *
 * One line per habit, filled with its own title and face, because her habits
 * are whatever he has given her - there is no list of five to write copy for
 * any more, and a second copy of anything is a thing that drifts.
 */
export const NUDGE_LINES: readonly string[] = [
  '{emoji} {title}? Tap it if it happened 🤍',
  'Anything counts for {title} today.',
  '{emoji} {title}, whenever it fits today.',
  'A small {title} still counts.',
];

/** Fill one of the lines above for a habit. */
export function nudgeFor(title: string, emoji: string): string {
  const line = NUDGE_LINES[Math.floor(Math.random() * NUDGE_LINES.length)];
  return line
    .replaceAll('{title}', title.toLowerCase())
    .replaceAll('{emoji}', emoji);
}
