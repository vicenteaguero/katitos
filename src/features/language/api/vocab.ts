import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { useUserId } from '@kernel/auth';
import { BUCKETS, storagePaths, useUpload } from '@kernel/storage';
import { toast, type AudioClip } from '@kernel/ui';
import type { TargetLang, Vocab } from '../types';
import { schedule, type Grade, type Schedule } from '../lib/srs';

/**
 * The dictionary — every word either of us has ever been taught.
 *
 * One row per word, so correcting a stress mark corrects it in every lesson
 * that word appears in. That was the whole reason for moving off the old
 * per-deck cards.
 */
export function useVocab(target?: TargetLang, search?: string) {
  return useQuery({
    queryKey: [...qk.lang.vocab(), target ?? 'all', search ?? ''] as const,
    staleTime: 30_000,
    queryFn: async (): Promise<Vocab[]> => {
      let q = supabase.from('lang_vocab').select('*');
      if (target) q = q.eq('term_lang', target);
      if (search?.trim()) {
        const term = `%${search.trim()}%`;
        q = q.or(`ru.ilike.${term},en.ilike.${term},es.ilike.${term}`);
      }
      const { data, error } = await q
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Every word, unfiltered — what the study session draws its queue from. */
export function useAllVocab(target: TargetLang = 'ru') {
  return useQuery({
    queryKey: [...qk.lang.vocab(), 'all', target] as const,
    staleTime: 60_000,
    queryFn: async (): Promise<Vocab[]> => {
      const { data, error } = await supabase
        .from('lang_vocab')
        .select('*')
        .eq('term_lang', target);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddVocab() {
  const qc = useQueryClient();
  const { upload } = useUpload();
  return useMutation({
    mutationFn: async (v: {
      termLang: TargetLang;
      ru: string;
      en?: string | null;
      es?: string | null;
      transliteration?: string | null;
      stress?: string | null;
      partOfSpeech?: string | null;
      notesEn?: string | null;
      notesEs?: string | null;
      tags?: string[];
      audio?: AudioClip | null;
    }) => {
      const { data, error } = await supabase
        .from('lang_vocab')
        .insert({
          term_lang: v.termLang,
          ru: v.ru.trim(),
          en: v.en?.trim() || null,
          es: v.es?.trim() || null,
          transliteration: v.transliteration?.trim() || null,
          stress: v.stress?.trim() || null,
          part_of_speech: v.partOfSpeech?.trim() || null,
          notes_en: v.notesEn?.trim() || null,
          notes_es: v.notesEs?.trim() || null,
          tags: v.tags ?? [],
        })
        .select('id')
        .single();
      if (error) throw error;

      if (v.audio) {
        // The extension follows the recording, not a guess — that mismatch is
        // exactly what made clips unplayable across devices.
        const path = storagePaths.languageAudio(data.id, v.audio.ext);
        await upload(BUCKETS.languageAudio, path, v.audio.blob, {
          contentType: v.audio.mime,
        });
        const { error: upErr } = await supabase
          .from('lang_vocab')
          .update({ audio_path: path })
          .eq('id', data.id);
        if (upErr) throw upErr;
      }
      return data.id as string;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.lang.vocab() }),
  });
}

/**
 * Edit a word — audio included.
 *
 * The old screens could only attach a recording when the card was first
 * created, so fixing a bad clip meant deleting the card and losing every
 * review of it with it.
 */
export function useUpdateVocab() {
  const qc = useQueryClient();
  const { upload } = useUpload();
  return useMutation({
    mutationFn: async (v: {
      id: string;
      patch: Partial<
        Pick<
          Vocab,
          | 'ru'
          | 'en'
          | 'es'
          | 'transliteration'
          | 'stress'
          | 'part_of_speech'
          | 'notes_en'
          | 'notes_es'
          | 'tags'
        >
      >;
      audio?: AudioClip | null;
    }) => {
      const patch: Partial<Vocab> = { ...v.patch };
      if (v.audio) {
        const path = storagePaths.languageAudio(v.id, v.audio.ext);
        await upload(BUCKETS.languageAudio, path, v.audio.blob, {
          contentType: v.audio.mime,
        });
        patch.audio_path = path;
      }
      const { error } = await supabase
        .from('lang_vocab')
        .update(patch)
        .eq('id', v.id);
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.lang.vocab() }),
  });
}

export function useDeleteVocab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (word: Vocab) => {
      const { error } = await supabase
        .from('lang_vocab')
        .delete()
        .eq('id', word.id);
      if (error) throw error;
      // Take the recording with it, rather than leaving it orphaned in the
      // bucket forever the way the old delete did.
      if (word.audio_path) {
        await supabase.storage
          .from(BUCKETS.languageAudio)
          .remove([word.audio_path]);
      }
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.lang.vocab() }),
  });
}

/* ── Spaced repetition ───────────────────────────────────────────────────── */

export type VocabReview = {
  vocab_id: string;
  user_id: string;
  ease: number;
  interval_days: number;
  due_on: string;
  reps: number;
  lapses: number;
  last_grade: number | null;
  last_seen_at: string | null;
};

/** My own scheduling state. Built into a lookup in `select`, never cached as a Map. */
export function useMyReviews() {
  const userId = useUserId();
  return useQuery({
    queryKey: [...qk.lang.vocabReviews(), userId ?? 'anon'] as const,
    enabled: !!userId,
    queryFn: async (): Promise<VocabReview[]> => {
      const { data, error } = await supabase
        .from('lang_vocab_reviews')
        .select('*')
        .eq('user_id', userId as string);
      if (error) throw error;
      return (data ?? []) as VocabReview[];
    },
    select: (rows) => {
      const out = new Map<string, VocabReview>();
      for (const row of rows) out.set(row.vocab_id, row);
      return out;
    },
  });
}

/** Everyone's — she needs to see what he keeps forgetting. */
export function useAllReviews() {
  return useQuery({
    queryKey: [...qk.lang.vocabReviews(), 'all'] as const,
    queryFn: async (): Promise<VocabReview[]> => {
      const { data, error } = await supabase
        .from('lang_vocab_reviews')
        .select('*');
      if (error) throw error;
      return (data ?? []) as VocabReview[];
    },
  });
}

/**
 * Record how a word went, and when to ask again.
 *
 * The interval maths is the same unit-tested SM-2 as before — only the table
 * it writes to changed.
 */
export function useGradeVocab() {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: async (v: {
      vocabId: string;
      grade: Grade;
      prev: Schedule | null;
    }) => {
      const next = schedule(v.prev, v.grade);
      const { error } = await supabase.from('lang_vocab_reviews').upsert(
        {
          vocab_id: v.vocabId,
          ...(userId ? { user_id: userId } : {}),
          ease: next.ease,
          interval_days: next.interval_days,
          due_on: next.due_on,
          reps: next.reps,
          lapses: next.lapses,
          last_grade: v.grade,
          last_seen_at: new Date().toISOString(),
        } as never,
        { onConflict: 'vocab_id,user_id' }
      );
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: qk.lang.vocabReviews() }),
  });
}
