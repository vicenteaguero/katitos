import type { Tables } from '@kernel/supabase';

export type Phrase = Tables<'phrases'>;
export type Deck = Tables<'language_decks'>;
/**
 * Russian and Spanish — the two we actually teach each other.
 *
 * Turkish and Georgian were added for the trip and are gone from the UI. Their
 * rows are still in the database (a migration created them, so they exist on
 * production); a later gated migration removes those and re-tightens the CHECK.
 */
export type Lang = 'ru' | 'es';

/** A deck plus its card count (from the embedded aggregate). */
export interface DeckWithCount extends Deck {
  cardCount: number;
}

export const LANG_LABELS: Record<Lang, string> = {
  ru: 'Russian',
  es: 'Spanish',
};
