/**
 * The five, and whether they are hers yet.
 *
 * She asked for help with five things - sleep, study, work, eating properly,
 * walking or training - so the five are a constant, not rows in a table. Nothing
 * on any screen adds a sixth, `seed.sql` never runs on prod, and a goal list
 * that could go missing in the cloud is worse than no goal list at all.
 *
 * `supabase/functions/_shared/five-goals.ts` holds the same five for the
 * scheduler, which runs in Deno and cannot see this file - the same split
 * `zone.ts` lives with. Ids, labels and windows must match; the nudge lines
 * exist only there, because a push is the only place they are ever read.
 */

/**
 * Is the Five hers yet?
 *
 * While this is false the feature is his alone: no row in her drawer, no card on
 * her home, and not one push - the scheduler sends her reminders to HIM instead,
 * which is how the timing and the wording get tuned before she ever feels them.
 * Opening it is this line, the same line in the scheduler's copy, and a
 * changelog entry written the day he tells her.
 */
export const FIVE_OPEN = false;

/** Her day stays markable until 3AM the next morning, and not a minute later. */
export const GRACE_HOUR = 3;

export interface Goal {
  id: GoalId;
  label: string;
  /** What it actually asks of her, in her own words where possible. */
  hint: string;
  emoji: string;
}

export type GoalId = 'sleep' | 'study' | 'work' | 'eat' | 'move';

/**
 * The order is the order of her day, not a priority: the night first, then the
 * hours she works and studies, then the plate, then the walk. Reading down the
 * screen should feel like reading down a day.
 */
export const GOALS: Goal[] = [
  { id: 'sleep', label: 'Sleep', hint: 'Seven or eight hours', emoji: '🌙' },
  { id: 'work', label: 'Work', hint: 'Whatever the day asked', emoji: '💼' },
  { id: 'study', label: 'Study', hint: 'Even a short one counts', emoji: '📚' },
  {
    id: 'eat',
    label: 'Eat well',
    hint: 'A real plate, sitting down',
    emoji: '🍲',
  },
  {
    id: 'move',
    label: 'Walk or train',
    hint: 'Twenty minutes is a walk',
    emoji: '🏃',
  },
];

export const GOAL_IDS: GoalId[] = GOALS.map((g) => g.id);

/** How many of the five there are, named so no screen hardcodes a 5. */
export const FIVE = GOALS.length;

export const goalById = (id: string): Goal | undefined =>
  GOALS.find((g) => g.id === id);
