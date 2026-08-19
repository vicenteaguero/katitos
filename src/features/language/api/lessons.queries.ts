import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { useUserId } from '@kernel/auth';
import type {
  Attempt,
  Block,
  Lang,
  Exercise,
  Lesson,
  LessonFull,
  Media,
  Vocab,
} from '../types';

/**
 * One lesson, whole: its blocks, its exercises, its attachments, and the words
 * each vocab block points at.
 *
 * A lesson is read top to bottom, so it is fetched in one go rather than block
 * by block — and that includes the things blocks REFER to. A vocab block that
 * has to fetch its own words, or a media block that has to fetch its own file,
 * is a waterfall in the middle of a page of text.
 */
/**
 * The newest answer per question.
 *
 * Correct ONLY because the query orders `answered_at` descending — the first
 * row seen for an exercise is its latest attempt. Hoisted so the reference is
 * stable across renders.
 */
export const latestPerExercise = (rows: Attempt[]): Attempt[] => {
  const latest = new Map<string, Attempt>();
  for (const row of rows) {
    if (!latest.has(row.exercise_id)) latest.set(row.exercise_id, row);
  }
  return [...latest.values()];
};

/** Narrow whatever the row holds to one of the three we support. */
function langOf(value: string | null | undefined): Lang {
  return value === 'es' || value === 'en' ? value : 'ru';
}

export function useLesson(lessonId: string | undefined) {
  return useQuery({
    queryKey: qk.lang.lesson(lessonId ?? 'none'),
    enabled: !!lessonId,
    staleTime: 30_000,
    queryFn: async (): Promise<LessonFull> => {
      const { data, error } = await supabase
        .from('lang_lessons')
        .select(
          '*, unit:lang_units(course_id, course:lang_courses(target_lang)), blocks:lang_blocks(*), exercises:lang_exercises(*)'
        )
        .eq('id', lessonId as string)
        .single();
      if (error) throw error;
      const row = data as Lesson & {
        unit: {
          course_id: string;
          course: { target_lang: string } | null;
        } | null;
        blocks: Block[] | null;
        exercises: Exercise[] | null;
      };

      const blocks = [...(row.blocks ?? [])].sort(
        (a, b) => a.position - b.position
      );

      // The words and the attachments are fetched TOGETHER, not one after the
      // other: neither depends on the other, and a lesson that opens in two
      // round-trips instead of three is a third faster on a phone.
      const vocabBlockIds = blocks
        .filter((b) => b.kind === 'vocab')
        .map((b) => b.id);

      const [links, media] = await Promise.all([
        vocabBlockIds.length
          ? supabase
              .from('lang_block_vocab')
              .select('block_id, position, vocab:lang_vocab(*)')
              .in('block_id', vocabBlockIds)
              .order('position', { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('lang_media')
          .select('*')
          .eq('lesson_id', lessonId as string)
          .order('created_at', { ascending: false }),
      ]);

      // These used to swallow their errors, so a refused read rendered a
      // lesson with no words and no attachments — indistinguishable from a
      // lesson she hadn't filled in yet.
      if (links.error) throw links.error;
      if (media.error) throw media.error;

      const vocabByBlock: Record<string, Vocab[]> = {};
      for (const link of (links.data ?? []) as unknown as {
        block_id: string;
        vocab: Vocab | null;
      }[]) {
        if (!link.vocab) continue;
        (vocabByBlock[link.block_id] ??= []).push(link.vocab);
      }

      return {
        ...row,
        courseId: row.unit?.course_id ?? '',
        // Which language this lesson TEACHES. Everything downstream reads it:
        // which keyboard the typing questions show, which two languages the
        // builder offers as translations, which column a new word goes in.
        targetLang: langOf(row.unit?.course?.target_lang),
        blocks,
        exercises: [...(row.exercises ?? [])].sort(
          (a, b) => a.position - b.position
        ),
        media: (media.data ?? []) as Media[],
        vocabByBlock,
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
    select: latestPerExercise,
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
