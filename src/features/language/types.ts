import type { Tables } from '@kernel/supabase';

export type Phrase = Tables<'phrases'>;
export type Lang = 'ru' | 'es';

export const LANG_LABELS: Record<Lang, string> = {
  ru: 'Russian',
  es: 'Spanish',
};
