import type { Tables } from '@kernel/supabase';

export type Phrase = Tables<'phrases'>;
export type Deck = Tables<'language_decks'>;
export type Lang = 'ru' | 'es' | 'tr' | 'ka';

/** A deck plus its card count (from the embedded aggregate). */
export interface DeckWithCount extends Deck {
  cardCount: number;
}

export const LANG_LABELS: Record<Lang, string> = {
  ru: 'Russian',
  es: 'Spanish',
  tr: 'Turkish',
  ka: 'Georgian',
};
