import type { Tables } from '@kernel/supabase';

export type DeckMode = 'quiz' | 'compare' | 'swipe';

export interface DeckCardOption {
  id: string;
  label: string;
  imagePath?: string;
}

/** Shape stored in deck_cards.prompt (jsonb). */
export interface DeckCardPrompt {
  text?: string;
  imagePath?: string;
  audioPath?: string;
  options?: DeckCardOption[];
}

export type DeckRow = Tables<'decks'>;
export type DeckCardRow = Tables<'deck_cards'>;
export type DeckResponseRow = Tables<'deck_responses'>;

/** A card with its prompt parsed. */
export interface DeckCard extends Omit<DeckCardRow, 'prompt' | 'correct'> {
  prompt: DeckCardPrompt;
  correct: unknown;
}
