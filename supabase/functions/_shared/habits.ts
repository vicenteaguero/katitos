/**
 * The knobs the Habits clock turns, in one place.
 *
 * Kept here rather than in the function body because these are decisions, not
 * implementation: the day the nudges are switched on, the line that does it
 * should be findable by someone who is not reading a 500-line scheduler.
 */

/**
 * Is the clock allowed to buzz HER phone?
 *
 * On since the morning of 26 September 2026, the day he told her. It gates
 * every push to her, not just the random ones: while it was false the streak's
 * "still to tick" nudge would have listed her five new habits by name on her
 * lock screen before he had said a word.
 *
 * It is still the one switch. If any of this ever has to go quiet for her -
 * a bad week, a hospital, a phone she does not want going off - this is the
 * line to flip, and everything else keeps running for him.
 */
export const NUDGES_ON = true;

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
