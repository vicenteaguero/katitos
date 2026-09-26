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

/**
 * Habits that do not wait for a random slot: they go off at set hours on her
 * clock, each hour with its own voice. Matched by title, since he can rename.
 *
 * `ifUndone` drops the reminder once the habit is ticked for the day. The
 * morning sleep one asks her to mark the night, so a tick answers it; the
 * bedtime one is about tonight and goes regardless.
 */
export interface FixedNudge {
  hour: number;
  ifUndone: boolean;
  title: string;
  lines: readonly string[];
}

export const FIXED_NUDGES: readonly {
  match: RegExp;
  at: readonly FixedNudge[];
}[] = [
  {
    match: /sleep|сон|спат|dormir/i,
    at: [
      {
        hour: 9,
        ifUndone: true,
        title: '🌙 How did you sleep?',
        lines: [
          'Good morning, Liubimaya. Slept well? Mark it 🤍',
          'Morning, my sunshine ☀️ Tap it if the night was good.',
        ],
      },
      {
        hour: 22,
        ifUndone: false,
        title: '🌙 Bedtime, katita',
        lines: [
          'Go to sleep, beautiful katita. You need your rest 🤍',
          'Phone down, eyes closed, bonita. Sleep well 🌙',
          'Спокойной ночи, любимая. Bed now 😴',
        ],
      },
    ],
  },
  {
    match: /\beat|food|lunch|comer|еда/i,
    at: [
      {
        hour: 12,
        ifUndone: true,
        title: '🍲 Lunch time',
        lines: [
          'A good lunch today, Liubimaya? Something real 🍲',
          'Middle of the day: eat something proper, my sunshine ☀️',
        ],
      },
      {
        hour: 18,
        ifUndone: false,
        title: '🍲 Snack patrol',
        lines: [
          'No shitty snacks tonight, bonita 🙅‍♀️🍫',
          'Chips are not dinner, katita. Eat something good 🥗',
          'Put the sweets down, Liubimaya 👀 a real dinner instead.',
        ],
      },
    ],
  },
];

/** The fixed reminders for a habit, or null if it takes a random slot. */
export function fixedFor(title: string): readonly FixedNudge[] | null {
  return FIXED_NUDGES.find((f) => f.match.test(title))?.at ?? null;
}

export function lineOf(n: FixedNudge): string {
  return n.lines[Math.floor(Math.random() * n.lines.length)];
}
