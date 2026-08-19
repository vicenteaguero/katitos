import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { useUserId } from '@kernel/auth';
import type { Attempt, Block, Exercise, Lesson, LessonFull } from '../types';

/**
 * One lesson, whole: its blocks and its exercises, both in order.
 *
 * A lesson is read from top to bottom, so it is fetched in one go rather than
 * block by block — there is no point streaming a page of text.
 */
export function useLesson(lessonId: string | undefined) {
  return useQuery({
    queryKey: qk.lang.lesson(lessonId ?? 'none'),
    enabled: !!lessonId,
    staleTime: 30_000,
    queryFn: async (): Promise<LessonFull> => {
      const { data, error } = await supabase
        .from('lang_lessons')
        .select('*, blocks:lang_blocks(*), exercises:lang_exercises(*)')
        .eq('id', lessonId as string)
        .single();
      if (error) throw error;
      const row = data as Lesson & {
        blocks: Block[] | null;
        exercises: Exercise[] | null;
      };
      return {
        ...row,
        blocks: [...(row.blocks ?? [])].sort((a, b) => a.position - b.position),
        exercises: [...(row.exercises ?? [])].sort(
          (a, b) => a.position - b.position
        ),
      };
    },
  });
}

/**
 * My latest answer to each exercise in this lesson.
 *
 * Attempts are deliberately append-only — homework is meant to be redone — so
 * "where was I" means the newest row per exercise, not the only row.
 */
export function useMyAttempts(lessonId: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: [
      ...qk.lang.attempts(lessonId ?? 'none'),
      userId ?? 'anon',
    ] as const,
    enabled: !!lessonId && !!userId,
    queryFn: async (): Promise<Attempt[]> => {
      const { data, error } = await supabase
        .from('lang_attempts')
        .select('*, exercise:lang_exercises!inner(lesson_id)')
        .eq('user_id', userId as string)
        .eq('exercise.lesson_id', lessonId as string)
        .order('answered_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Attempt[];
    },
    select: (rows) => {
      // Newest first out of the query, so the first one seen per exercise wins.
      const latest = new Map<string, Attempt>();
      for (const row of rows) {
        if (!latest.has(row.exercise_id)) latest.set(row.exercise_id, row);
      }
      return [...latest.values()];
    },
  });
}

/**
 * Everything he has answered in a lesson — what she reads when marking.
 *
 * Both people's rows are visible by policy; this asks for the other person's
 * on purpose, because marking your own homework is not a feature.
 */
export function useAttemptsForMarking(lessonId: string | undefined) {
  return useQuery({
    queryKey: [...qk.lang.attempts(lessonId ?? 'none'), 'all'] as const,
    enabled: !!lessonId,
    queryFn: async (): Promise<Attempt[]> => {
      const { data, error } = await supabase
        .from('lang_attempts')
        .select('*, exercise:lang_exercises!inner(lesson_id)')
        .eq('exercise.lesson_id', lessonId as string)
        .order('answered_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Attempt[];
    },
  });
}
