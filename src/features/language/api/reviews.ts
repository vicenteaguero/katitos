import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { useUserId } from '@kernel/auth';
import { DateTime } from '@kernel/lib';
import type { PhraseReview, Grade } from '../lib/srs';
import { schedule } from '../lib/srs';

export const reviewKeys = {
  all: () => ['language', 'reviews'] as const,
  mine: (userId: string | null) =>
    ['language', 'reviews', userId ?? 'anon'] as const,
  everyone: () => ['language', 'reviews', 'all'] as const,
};

/** My own answers, keyed by phrase id. */
export function useMyReviews() {
  const userId = useUserId();
  return useQuery({
    queryKey: reviewKeys.mine(userId),
    enabled: !!userId,
    // The queryFn returns a plain ARRAY on purpose: query data is dehydrated to
    // localStorage, and a Map JSON-serializes to {} — so a rehydrated cache
    // would hand every consumer an object whose .get() does not exist.
    // `select` rebuilds the Map on read, and select output is never persisted.
    queryFn: async (): Promise<PhraseReview[]> => {
      const { data, error } = await supabase
        .from('phrase_reviews')
        .select('*')
        .eq('user_id', userId as string);
      if (error) throw error;
      return data ?? [];
    },
    select: (rows) => new Map(rows.map((r) => [r.phrase_id, r])),
  });
}

/**
 * Everyone's answers — this is what lets her see what he keeps forgetting.
 * RLS allows reading both rows on purpose; only writing is self-scoped.
 */
export function useAllReviews() {
  return useQuery({
    queryKey: reviewKeys.everyone(),
    queryFn: async (): Promise<PhraseReview[]> => {
      const { data, error } = await supabase
        .from('phrase_reviews')
        .select('*')
        .order('lapses', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Record an answer and schedule the card's next appearance.
 *
 * The old flow threw the answer away when you left the screen; this is the
 * whole difference between a flashcard toy and something that teaches.
 */
export function useGradePhrase() {
  const qc = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: async (v: {
      phraseId: string;
      grade: Grade;
      prev: PhraseReview | null;
    }) => {
      if (!userId) throw new Error('Not signed in');
      const next = schedule(
        v.prev
          ? {
              ease: v.prev.ease,
              interval_days: v.prev.interval_days,
              due_on: v.prev.due_on,
              reps: v.prev.reps,
              lapses: v.prev.lapses,
            }
          : null,
        v.grade
      );
      const { error } = await supabase.from('phrase_reviews').upsert(
        {
          phrase_id: v.phraseId,
          user_id: userId,
          ease: next.ease,
          interval_days: next.interval_days,
          due_on: next.due_on,
          reps: next.reps,
          lapses: next.lapses,
          last_grade: v.grade,
          last_seen_at: DateTime.now().toISO(),
        },
        { onConflict: 'phrase_id,user_id' }
      );
      if (error) throw error;
      return next;
    },
    // Optimistic: the next card should appear the instant you answer, not
    // after a round-trip.
    // Optimistic on the ARRAY the cache actually holds (the Map is built by
    // `select` on read, so it never exists in the cache).
    onMutate: async (v) => {
      const key = reviewKeys.mine(userId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<PhraseReview[]>(key);
      if (prev) {
        const next = schedule(
          v.prev
            ? {
                ease: v.prev.ease,
                interval_days: v.prev.interval_days,
                due_on: v.prev.due_on,
                reps: v.prev.reps,
                lapses: v.prev.lapses,
              }
            : null,
          v.grade
        );
        const row = {
          ...(v.prev ?? {
            phrase_id: v.phraseId,
            user_id: userId ?? '',
            last_seen_at: null,
            updated_at: new Date().toISOString(),
          }),
          ...next,
          last_grade: v.grade,
        } as PhraseReview;
        qc.setQueryData<PhraseReview[]>(key, [
          ...prev.filter((r) => r.phrase_id !== v.phraseId),
          row,
        ]);
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(reviewKeys.mine(userId), ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: reviewKeys.all() });
    },
  });
}
