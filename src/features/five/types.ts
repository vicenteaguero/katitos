import type { Tables } from '@kernel/supabase';

export type FiveMark = Tables<'five_marks'>;
export type FiveDayRow = Tables<'five_days'>;
export type FiveBet = Tables<'five_bets'>;
export type FiveSettingsRow = Tables<'five_settings'>;

export type BetStatus = 'open' | 'won' | 'lost' | 'void';
