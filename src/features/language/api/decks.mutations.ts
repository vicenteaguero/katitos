import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { BUCKETS, storagePaths, useUpload } from '@kernel/storage';
import { toast } from '@kernel/ui';
import { deckKeys } from './decks.queries';
import type { Lang } from '../types';

/** Create a deck ("a little course your love will take"). */
export function useCreateDeck() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (input: {
      language: Lang;
      title: string;
      description?: string | null;
      emoji?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('language_decks')
        .insert({
          language: input.language,
          title: input.title,
          description: input.description ?? null,
          emoji: input.emoji ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: deckKeys.list(v.language) }),
  });
}

/** Add a card (phrase + optional audio) to a deck. */
export function useAddCard() {
  const qc = useQueryClient();
  const { upload } = useUpload();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (input: {
      deckId: string;
      language: Lang;
      text: string;
      translation?: string;
      transliteration?: string;
      example?: string;
      audioBlob?: Blob | null;
    }) => {
      const { data, error } = await supabase
        .from('phrases')
        .insert({
          deck_id: input.deckId,
          language: input.language,
          text: input.text,
          translation: input.translation ?? null,
          transliteration: input.transliteration ?? null,
          example: input.example ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;
      const id = data.id as string;

      if (input.audioBlob) {
        const path = storagePaths.languageAudio(id);
        await upload(BUCKETS.languageAudio, path, input.audioBlob, {
          contentType: 'audio/webm',
        });
        const { error: upErr } = await supabase
          .from('phrases')
          .update({ audio_path: path })
          .eq('id', id);
        if (upErr) throw upErr;
      }
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: deckKeys.cards(v.deckId) });
      void qc.invalidateQueries({ queryKey: deckKeys.list(v.language) });
    },
  });
}

/**
 * Edit a card that already exists.
 *
 * Until now the only way to fix a typo was to delete the card and retype it —
 * which also threw away every review of it. For a teacher maintaining a real
 * course, that was the single most irritating gap in the feature.
 */
export function useUpdateCard() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (input: {
      id: string;
      deckId: string;
      text?: string;
      translation?: string | null;
      transliteration?: string | null;
      example?: string | null;
      notes?: string | null;
    }) => {
      const { id, deckId: _deckId, ...patch } = input;
      const { error } = await supabase
        .from('phrases')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: deckKeys.cards(v.deckId) }),
  });
}

/**
 * Paste a whole lesson at once.
 *
 * One card per line, `russian | meaning | sounds-like`, the last two optional.
 * Typing thirty cards through a sheet is not something anyone does twice.
 */
export function useBulkAddCards() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (input: {
      deckId: string;
      language: Lang;
      raw: string;
    }) => {
      const rows = parseBulk(input.raw).map((r) => ({
        deck_id: input.deckId,
        language: input.language,
        text: r.text,
        translation: r.translation,
        transliteration: r.transliteration,
      }));
      if (rows.length === 0) throw new Error('Nothing to add');
      const { error } = await supabase.from('phrases').insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: deckKeys.cards(v.deckId) });
      void qc.invalidateQueries({ queryKey: deckKeys.list(v.language) });
    },
  });
}

/** `word | meaning | sounds-like` per line; blank lines ignored. */
export function parseBulk(raw: string): {
  text: string;
  translation: string | null;
  transliteration: string | null;
}[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [text, translation, transliteration] = line
        .split('|')
        .map((p) => p.trim());
      return {
        text,
        translation: translation || null,
        transliteration: transliteration || null,
      };
    })
    .filter((r) => !!r.text);
}

export function useDeleteCard() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async ({ id }: { id: string; deckId: string }) => {
      const { error } = await supabase.from('phrases').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: deckKeys.cards(v.deckId) }),
  });
}
