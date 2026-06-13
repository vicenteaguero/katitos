import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import type { Deck, DeckWithCount, Lang, Phrase } from '../types';

export const deckKeys = {
  list: (lang: Lang) => ['language-decks', lang] as const,
  one: (id: string) => ['language-deck', id] as const,
  cards: (id: string) => ['language-deck', id, 'cards'] as const,
};

/** Decks for a language, each with its card count. */
export function useDecks(language: Lang) {
  return useQuery({
    queryKey: deckKeys.list(language),
    queryFn: async (): Promise<DeckWithCount[]> => {
      const { data, error } = await supabase
        .from('language_decks')
        .select('*, phrases(count)')
        .eq('language', language)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((d) => {
        const { phrases, ...deck } = d as Deck & {
          phrases: { count: number }[];
        };
        return { ...deck, cardCount: phrases?.[0]?.count ?? 0 };
      });
    },
  });
}

export function useDeck(deckId: string | undefined) {
  return useQuery({
    queryKey: deckKeys.one(deckId ?? 'none'),
    enabled: !!deckId,
    queryFn: async (): Promise<Deck | null> => {
      const { data, error } = await supabase
        .from('language_decks')
        .select('*')
        .eq('id', deckId as string)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** The cards (phrases) in a deck, in authored order. */
export function useDeckCards(deckId: string | undefined) {
  return useQuery({
    queryKey: deckKeys.cards(deckId ?? 'none'),
    enabled: !!deckId,
    queryFn: async (): Promise<Phrase[]> => {
      const { data, error } = await supabase
        .from('phrases')
        .select('*')
        .eq('deck_id', deckId as string)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
