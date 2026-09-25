import type { Tables } from '@kernel/supabase';

export type FiveDayRow = Tables<'five_days'>;
export type FiveBet = Tables<'five_bets'>;
export type FiveSettingsRow = Tables<'five_settings'>;
export type BetStatus = 'open' | 'won' | 'lost' | 'void';
/** Only the two dates matter to a screen; the rest is bookkeeping. */
export type FivePause = Pick<Tables<'five_pauses'>, 'from_day' | 'to_day'>;

/** The streak habit that is one of the Five, carrying which goal it is. */
export type GoalHabit = Tables<'habits'> & { five_goal_id: string };

/**
 * A tick, as the Five needs to read it.
 *
 * There is no table of its own behind this: it is a row of `habit_entries`,
 * the same row the streak draws and the same row the home card ticks. What the
 * Five adds is knowing which goal the habit was.
 */
export interface GoalTick {
  day: string;
  goalId: string;
  markedBy: string | null;
  revokedAt: string | null;
}
