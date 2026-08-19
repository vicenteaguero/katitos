import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { BUCKETS, storagePaths, useUpload } from '@kernel/storage';
import type { AudioClip } from '@kernel/ui';
import { qk } from '@kernel/query';
import type {
  DeckCardOption,
  DeckCardPrompt,
  DeckMode,
} from '@kernel/engines/deck';

export interface CreateDeckInput {
  kind: string;
  mode: DeckMode;
  title: string;
  description?: string | null;
}

export function useCreateDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateDeckInput): Promise<string> => {
      const { data, error } = await supabase
        .from('decks')
        .insert(input)
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.deck.all() }),
  });
}

export interface AddCardInput {
  deckId: string;
  position: number;
  text?: string;
  options?: DeckCardOption[];
  imageBlob?: Blob | null;
  audio?: AudioClip | null;
  /** quiz mode: the correct answer value, e.g. { optionId } or { text }. */
  correct?: unknown;
}

export function useAddCard() {
  const qc = useQueryClient();
  const { upload } = useUpload();
  return useMutation({
    mutationFn: async (input: AddCardInput) => {
      const prompt: DeckCardPrompt = {};
      if (input.text) prompt.text = input.text;
      if (input.options?.length) prompt.options = input.options;

      const { data, error } = await supabase
        .from('deck_cards')
        .insert({
          deck_id: input.deckId,
          position: input.position,
          prompt: prompt as never,
          correct: (input.correct ?? null) as never,
        })
        .select('id')
        .single();
      if (error) throw error;
      const cardId = data.id;

      let media = false;
      if (input.imageBlob) {
        const path = storagePaths.quizImage(input.deckId, cardId);
        await upload(BUCKETS.quizMedia, path, input.imageBlob, {
          contentType: 'image/jpeg',
        });
        prompt.imagePath = path;
        media = true;
      }
      if (input.audio) {
        const path = storagePaths.quizAudio(
          input.deckId,
          cardId,
          input.audio.ext
        );
        await upload(BUCKETS.quizMedia, path, input.audio.blob, {
          contentType: input.audio.mime,
        });
        prompt.audioPath = path;
        media = true;
      }
      if (media) {
        const { error: upErr } = await supabase
          .from('deck_cards')
          .update({ prompt: prompt as never })
          .eq('id', cardId);
        if (upErr) throw upErr;
      }
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: qk.deck.cards(vars.deckId) }),
  });
}

export function useDeleteDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deckId: string) => {
      const { error } = await supabase.from('decks').delete().eq('id', deckId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.deck.all() }),
  });
}
