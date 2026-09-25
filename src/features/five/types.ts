import type { Tables } from '@kernel/supabase';

export type FiveMark = Tables<'five_marks'>;
export type FiveDayRow = Tables<'five_days'>;
export type FiveBet = Tables<'five_bets'>;
export type FiveSettingsRow = Tables<'five_settings'>;
/** Only the two dates matter to a screen; the rest is bookkeeping. */
export type FivePause = Pick<Tables<'five_pauses'>, 'from_day' | 'to_day'>;

export type BetStatus = 'open' | 'won' | 'lost' | 'void';
