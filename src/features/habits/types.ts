import type { Tables } from '@kernel/supabase';

export type Habit = Tables<'habits'>;
export type HabitEntry = Tables<'habit_entries'>;

/** The money that rides on her habits. */
export type Bet = Tables<'bets'>;
export type HardDayRow = Tables<'hard_days'>;
export type MoneySettingsRow = Tables<'money_settings'>;
export type BetStatus = 'open' | 'won' | 'lost' | 'void';
/** Only the two dates matter to a screen; the rest is bookkeeping. */
export type MoneyPause = Pick<Tables<'money_pauses'>, 'from_day' | 'to_day'>;
