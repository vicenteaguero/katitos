/**
 * The five, and the hours they live in - the scheduler's copy.
 *
 * `src/features/five/lib/goals.ts` holds the same five for the app. They are
 * deliberately two files: this one runs in Deno with no access to the bundle,
 * the same way `polaroid-reminder/zone.ts` restates the day rule. Ids, labels
 * and windows must match; the nudge lines only exist here, because a push is
 * the only place they are ever read.
 */

/**
 * Is the Five hers yet?
 *
 * While this is false the feature is his private instrument: she has no row in
 * her drawer, no card on her home, and - the part that matters here - not one
 * push. Every reminder, warning and day summary goes to HIM instead, which is
 * also how the cadence gets tuned before she ever feels it. Flip this, and the
 * copy in the app, on the day he tells her.
 */
export const FIVE_OPEN = false;

/**
 * There is no window of the Five's own any more: a goal is a habit, a tick is a
 * row of `habit_entries`, and a day is settled when it has ended for both of
 * them. See `isDayFinal` in ../five/index.ts.
 */

/** The hours a nudge may land in, on her clock: 07:00 to 23:59. */
export const DAY_FROM = 7;
export const DAY_TO = 23.98;

export interface FiveGoal {
  id: string;
  label: string;
  emoji: string;
  /**
   * Local hours the single random nudge may land between.
   *
   * All five share the same window now - seven in the morning to just before
   * midnight, her time - because the ask was for the day's five nudges to land
   * at genuinely random hours rather than each one inside the slot where its
   * goal "belongs". The scheduler spreads them across that window (see
   * `functions/five/index.ts`) so five random draws cannot all land at once.
   */
  window: [number, number];
  /** One of these is picked at random, so it never reads like a cron job. */
  nudges: string[];
}

/**
 * The ORDER is the app's order (src/features/five/lib/goals.ts), and a test in
 * that file holds these two copies to it: the same five, the same names, the
 * same reading down a day.
 *
 * Sleep is asked about in the morning, because it is the only one you can
 * answer for a night that is already over. The rest sit inside the hours she
 * would plausibly be doing them, wide enough that the time is never the same
 * two days running.
 */
export const FIVE_GOALS: FiveGoal[] = [
  {
    id: 'sleep',
    label: 'Sleep',
    emoji: '🌙',
    window: [DAY_FROM, DAY_TO],
    nudges: [
      'Seven or eight hours last night? Tap it if you got them 🤍',
      'If the night gave you seven, this one is already done.',
      'One tap if last night was a real one 🌙',
    ],
  },
  {
    id: 'work',
    label: 'Work',
    emoji: '💼',
    window: [DAY_FROM, DAY_TO],
    nudges: [
      'Work in? Tap it when the day is done 💼',
      'Whatever you got through today counts. Tap it.',
      'Any work at all today? It counts 💼',
    ],
  },
  {
    id: 'study',
    label: 'Study',
    emoji: '📚',
    window: [DAY_FROM, DAY_TO],
    nudges: [
      'Any studying today? Even a short one counts 📚',
      'Open the book for a bit and this one is yours.',
      'Ten minutes of the book counts as a yes 📚',
    ],
  },
  {
    id: 'eat',
    label: 'Eat well',
    emoji: '🍲',
    window: [DAY_FROM, DAY_TO],
    nudges: [
      'When you eat something proper today, this one is yours 🍲',
      'A plate and a chair, whenever it fits.',
      'Lunch, then tap. That order 🤍',
    ],
  },
  {
    id: 'move',
    label: 'Walk or train',
    emoji: '🏃',
    window: [DAY_FROM, DAY_TO],
    nudges: [
      'Out for a walk? Twenty minutes is a walk 🏃',
      'Twenty minutes outside, if the day allows it 🏃',
      'Walk or train, either one, then tap 🤍',
    ],
  },
];

/** The five ids, in the order they are shown and settled. */
export const FIVE_GOAL_IDS: string[] = FIVE_GOALS.map((g) => g.id);
