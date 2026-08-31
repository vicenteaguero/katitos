import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { useUserId } from '@kernel/auth';
import { BUCKETS, storagePaths, useUpload } from '@kernel/storage';
import { toast, type AudioClip } from '@kernel/ui';
import type { Lang, Vocab } from '../types';
import { schedule, type Grade, type Schedule } from '../lib/srs';

/** Stable reference: an inline arrow re-runs `select` on every render. */
const reviewsByVocab = (rows: VocabReview[]) => {
  const out = new Map<string, VocabReview>();
  for (const row of rows) out.set(row.vocab_id, row);
  return out;
};

/**
 * The dictionary — every word either of us has ever been taught.
 *
 * One row per word, so correcting a stress mark corrects it in every lesson
 * that word appears in. That was the whole reason for moving off the old
 * per-deck cards.
 */
export function useVocab(target?: Lang, search?: string) {
  return useQuery({
    queryKey: [...qk.lang.vocab(), target ?? 'all', search ?? ''] as const,
    staleTime: 30_000,
    queryFn: async (): Promise<Vocab[]> => {
      // A word that was put away stays out of every list until Undo brings
      // it back — the row itself is kept, so nothing about it is lost.
      let q = supabase.from('lang_vocab').select('*').is('deleted_at', null);
      if (target) q = q.eq('term_lang', target);
      if (search?.trim()) {
        // Quoted and escaped. PostgREST's `or=()` is a comma-separated list,
        // so an unescaped comma in what she types — "мама, папа" — split the
        // filter into nonsense and the whole query came back 400.
        const term = `"%${search.trim().replace(/["\\]/g, '\\$&')}%"`;
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

/**
 * Every word in one language, unfiltered — the study session's queue.
 *
 * The language is always passed in. It used to default to Russian, which meant
 * every screen that forgot to think about it silently became Russian-only, and
 * the five Spanish words on production were invisible for a week.
 */
export function useAllVocab(target: Lang) {
  return useQuery({
    queryKey: [...qk.lang.vocab(), 'all', target] as const,
    staleTime: 60_000,
    queryFn: async (): Promise<Vocab[]> => {
      const { data, error } = await supabase
        .from('lang_vocab')
        .select('*')
        .eq('term_lang', target)
        .is('deleted_at', null);
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
      /** Which of the three columns below holds the word being taught. */
      termLang: Lang;
      ru?: string | null;
      en?: string | null;
      es?: string | null;
      transliteration?: string | null;
      stress?: string | null;
      partOfSpeech?: string | null;
      notesEn?: string | null;
      notesEs?: string | null;
      notesRu?: string | null;
      tags?: string[];
      audio?: AudioClip | null;
    }) => {
      // The headword is whichever column `termLang` names — checking `ru` for
      // a Spanish word found nothing, every time, and quietly made duplicates.
      const term = (v[v.termLang] ?? '').trim();
      if (!term)
        throw new Error('A word needs to be written in its own language');

      // One entry per word is the promise this table makes, and the quickest
      // way to break it is the add-without-leaving-the-lesson shortcut.
      const { data: existing } = await supabase
        .from('lang_vocab')
        .select('id')
        .eq('term_lang', v.termLang)
        .is('deleted_at', null)
        .ilike(v.termLang, term)
        .limit(1);
      if (existing?.length) return existing[0].id as string;

      const { data, error } = await supabase
        .from('lang_vocab')
        .insert({
          term_lang: v.termLang,
          ru: v.ru?.trim() || null,
          en: v.en?.trim() || null,
          es: v.es?.trim() || null,
          transliteration: v.transliteration?.trim() || null,
          stress: v.stress?.trim() || null,
          part_of_speech: v.partOfSpeech?.trim() || null,
          notes_en: v.notesEn?.trim() || null,
          notes_es: v.notesEs?.trim() || null,
          notes_ru: v.notesRu?.trim() || null,
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
          | 'notes_ru'
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

/**
 * Put a word away.
 *
 * Not a delete: deleting the row took its recording, every lesson's link to
 * it and BOTH people's review history with it, from one tap with no way back.
 * The row is marked instead and drops out of every list; Undo unmarks it.
 */
export function useDeleteVocab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (word: Vocab) => {
      const { error } = await supabase
        .from('lang_vocab')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', word.id);
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.lang.vocab() }),
  });
}

/** Bring a word back, exactly as it was. */
export function useRestoreVocab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lang_vocab')
        .update({ deleted_at: null })
        .eq('id', id);
      if (error) throw error;
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
    select: reviewsByVocab,
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
