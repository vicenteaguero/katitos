import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
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
      // Escaped: % and _ are wildcards to ilike, and a word is not a pattern.
      const pattern = term.replace(/[\\%_]/g, '\\$&');
      const { data: existing, error: lookErr } = await supabase
        .from('lang_vocab')
        .select('id, ru, en, es, audio_path, deleted_at')
        .eq('term_lang', v.termLang)
        .ilike(v.termLang, pattern)
        .limit(1);
      if (lookErr) throw lookErr;
      if (existing?.length) {
        // The word is already here — so what she just gave it goes ONTO it:
        // the recording always, a translation only where the row had none.
        // Returning early threw the recording away and called it a success,
        // which is why a word had to be recorded twice.
        const row = existing[0];
        const patch: Partial<Vocab> = {};
        // A word that was put away comes back — with its recording, its
        // lessons and both people's history — rather than being made twice.
        if (row.deleted_at) patch.deleted_at = null;
        if (!row.ru && v.ru?.trim()) patch.ru = v.ru.trim();
        if (!row.en && v.en?.trim()) patch.en = v.en.trim();
        if (!row.es && v.es?.trim()) patch.es = v.es.trim();
        if (v.audio) {
          const path = storagePaths.languageAudio(
            `${row.id}-${nanoid(6)}`,
            v.audio.ext
          );
          await upload(BUCKETS.languageAudio, path, v.audio.blob, {
            contentType: v.audio.mime,
            cacheControl: '31536000',
          });
          patch.audio_path = path;
        }
        if (Object.keys(patch).length) {
          const { error } = await supabase
            .from('lang_vocab')
            .update(patch)
            .eq('id', row.id);
          if (error) throw error;
          if (patch.audio_path && row.audio_path) {
            void supabase.storage
              .from(BUCKETS.languageAudio)
              .remove([row.audio_path]);
          }
        }
        return row.id as string;
      }

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
        // exactly what made clips unplayable across devices. And a path of
        // its own per recording, so a replacement is never served from the
        // cache as the clip it replaced.
        const path = storagePaths.languageAudio(
          `${data.id}-${nanoid(6)}`,
          v.audio.ext
        );
        await upload(BUCKETS.languageAudio, path, v.audio.blob, {
          contentType: v.audio.mime,
          cacheControl: '31536000',
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
      /** The clip this one replaces, so it can be taken out of storage. */
      previousAudioPath?: string | null;
    }) => {
      const patch: Partial<Vocab> = { ...v.patch };
      if (v.audio) {
        const path = storagePaths.languageAudio(
          `${v.id}-${nanoid(6)}`,
          v.audio.ext
        );
        await upload(BUCKETS.languageAudio, path, v.audio.blob, {
          contentType: v.audio.mime,
          cacheControl: '31536000',
        });
        patch.audio_path = path;
      }
      const { error } = await supabase
        .from('lang_vocab')
        .update(patch)
        .eq('id', v.id);
      if (error) throw error;
      if (patch.audio_path && v.previousAudioPath) {
        void supabase.storage
          .from(BUCKETS.languageAudio)
          .remove([v.previousAudioPath]);
      }
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

/**
 * Many words at once, from a pasted list.
 *
 * One insert for the lot. The ones already in the dictionary are left alone
 * (the caller has already set them aside with `splitKnown`), so pasting the
 * same list twice adds nothing twice.
 */
export function useAddVocabMany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      termLang: Lang;
      meaningLang: Lang;
      words: {
        term: string;
        meaning: string;
        transliteration?: string;
        tags: string[];
      }[];
    }) => {
      if (!v.words.length) return 0;
      const rows = v.words.map((w) => ({
        term_lang: v.termLang,
        [v.termLang]: w.term.trim(),
        ...(w.meaning.trim() ? { [v.meaningLang]: w.meaning.trim() } : {}),
        transliteration: w.transliteration?.trim() || null,
        tags: w.tags,
      }));
      const { error } = await supabase.from('lang_vocab').insert(rows as never);
      if (error) throw error;
      return rows.length;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.lang.vocab() }),
  });
}

/** The same tags onto many words at once — added, never replaced. */
export function useTagVocabMany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { words: Vocab[]; tags: string[] }) => {
      const results = await Promise.all(
        v.words.map((w) =>
          supabase
            .from('lang_vocab')
            .update({ tags: [...new Set([...(w.tags ?? []), ...v.tags])] })
            .eq('id', w.id)
        )
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.lang.vocab() }),
  });
}

/** Put many words away — one statement, one Undo. */
export function useDeleteVocabMany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return;
      const { error } = await supabase
        .from('lang_vocab')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.lang.vocab() }),
  });
}

/** And bring them all back. */
export function useRestoreVocabMany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return;
      const { error } = await supabase
        .from('lang_vocab')
        .update({ deleted_at: null })
        .in('id', ids);
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.lang.vocab() }),
  });
}

/** The lessons a word appears in — so a word knows where it is taught. */
export function useWordUses(vocabId: string | undefined) {
  return useQuery({
    queryKey: [...qk.lang.vocab(), 'uses', vocabId ?? 'none'] as const,
    enabled: !!vocabId,
    staleTime: 60_000,
    queryFn: async (): Promise<{ id: string; title: string }[]> => {
      const { data, error } = await supabase
        .from('lang_block_vocab')
        .select('block:lang_blocks(lesson:lang_lessons(id, title, deleted_at))')
        .eq('vocab_id', vocabId as string);
      if (error) throw error;
      const seen = new Map<string, string>();
      for (const row of (data ?? []) as unknown as {
        block: {
          lesson: {
            id: string;
            title: string;
            deleted_at: string | null;
          } | null;
        } | null;
      }[]) {
        const lesson = row.block?.lesson;
        if (lesson && !lesson.deleted_at) seen.set(lesson.id, lesson.title);
      }
      return [...seen].map(([id, title]) => ({ id, title }));
    },
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
