import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { useUserId } from '@kernel/auth';
import { useTableSync } from '@kernel/realtime';
import type {
  DeckCard,
  DeckCardPrompt,
  DeckCardRow,
  DeckResponseRow,
  DeckRow,
} from './types';

function parseCard(row: DeckCardRow): DeckCard {
  return {
    ...row,
    prompt: (row.prompt ?? {}) as DeckCardPrompt,
    correct: row.correct,
  };
}

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export interface UseDeckResult {
  deck: DeckRow | undefined;
  cards: DeckCard[];
  current: DeckCard | undefined;
  index: number;
  total: number;
  isLoading: boolean;
  /** My recorded answer for the current card (or null). */
  myAnswer: unknown;
  /** Partner's recorded answer for the current card (or null). */
  partnerAnswer: unknown;
  /** Whether the current card's answers are revealed. */
  isRevealed: boolean;
  isAnswered: boolean;
  /** Record an answer for the current card. */
  answer: (value: unknown) => void;
  isSaving: boolean;
  next: () => void;
  prev: () => void;
  goTo: (i: number) => void;
  /** Quiz: number of my correct answers. Compare: number of matches. */
  score: number;
  allAnswered: boolean;
}

/**
 * Headless engine for a DB-backed deck (quizzes / compare / QOTD). Loads the
 * deck, its cards and both members' responses; handles answering, the
 * reveal-when-both-answered rule (via Realtime), scoring and navigation.
 */
export function useDeck(deckId: string): UseDeckResult {
  const userId = useUserId();
  const qc = useQueryClient();
  const [index, setIndex] = useState(0);

  const deckQ = useQuery({
    queryKey: qk.deck.one(deckId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('decks')
        .select('*')
        .eq('id', deckId)
        .single();
      if (error) throw error;
      return data as DeckRow;
    },
  });

  const cardsQ = useQuery({
    queryKey: qk.deck.cards(deckId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deck_cards')
        .select('*')
        .eq('deck_id', deckId)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []).map(parseCard);
    },
  });

  const responsesQ = useQuery({
    queryKey: qk.deck.responses(deckId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deck_responses')
        .select('*')
        .eq('deck_id', deckId);
      if (error) throw error;
      return (data ?? []) as DeckResponseRow[];
    },
  });

  // Live updates so the partner's answers flip the reveal.
  useTableSync('deck_responses', qk.deck.responses(deckId), {
    filter: `deck_id=eq.${deckId}`,
  });

  const mutation = useMutation({
    mutationFn: async (vars: { card: DeckCard; value: unknown }) => {
      const correct =
        deckQ.data?.mode === 'quiz' && vars.card.correct != null
          ? eq(vars.value, vars.card.correct)
          : null;
      const { error } = await supabase.from('deck_responses').upsert(
        {
          deck_id: deckId,
          card_id: vars.card.id,
          answer: vars.value as never,
          correct,
        },
        { onConflict: 'card_id,user_id' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.deck.responses(deckId) });
    },
  });

  const cards = useMemo(() => cardsQ.data ?? [], [cardsQ.data]);
  const responses = useMemo(() => responsesQ.data ?? [], [responsesQ.data]);
  const current = cards[index];

  const responsesByCard = useMemo(() => {
    const map = new Map<
      string,
      { mine?: DeckResponseRow; partner?: DeckResponseRow }
    >();
    for (const r of responses) {
      const slot = map.get(r.card_id) ?? {};
      if (r.user_id === userId) slot.mine = r;
      else slot.partner = r;
      map.set(r.card_id, slot);
    }
    return map;
  }, [responses, userId]);

  const cur = current ? responsesByCard.get(current.id) : undefined;
  const myAnswer = cur?.mine?.answer ?? null;
  const partnerAnswer = cur?.partner?.answer ?? null;
  const isAnswered = cur?.mine != null;
  const mode = deckQ.data?.mode;

  const isRevealed = (() => {
    if (!current) return false;
    if (mode === 'swipe') return false;
    if (mode === 'quiz') return isAnswered;
    // compare
    if (deckQ.data?.reveal_when_both)
      return cur?.mine != null && cur?.partner != null;
    return isAnswered;
  })();

  const score = useMemo(() => {
    if (mode === 'quiz') {
      return responses.filter((r) => r.user_id === userId && r.correct).length;
    }
    if (mode === 'compare') {
      let matches = 0;
      for (const card of cards) {
        const slot = responsesByCard.get(card.id);
        if (
          slot?.mine &&
          slot?.partner &&
          eq(slot.mine.answer, slot.partner.answer)
        ) {
          matches += 1;
        }
      }
      return matches;
    }
    return 0;
  }, [mode, responses, userId, cards, responsesByCard]);

  const allAnswered =
    cards.length > 0 &&
    cards.every((c) => responsesByCard.get(c.id)?.mine != null);

  return {
    deck: deckQ.data,
    cards,
    current,
    index,
    total: cards.length,
    isLoading: deckQ.isLoading || cardsQ.isLoading || responsesQ.isLoading,
    myAnswer,
    partnerAnswer,
    isRevealed,
    isAnswered,
    answer: (value: unknown) => {
      if (current) mutation.mutate({ card: current, value });
    },
    isSaving: mutation.isPending,
    next: () => setIndex((i) => Math.min(i + 1, Math.max(0, cards.length - 1))),
    prev: () => setIndex((i) => Math.max(i - 1, 0)),
    goTo: (i: number) => setIndex(Math.max(0, Math.min(i, cards.length - 1))),
    score,
    allAnswered,
  };
}
