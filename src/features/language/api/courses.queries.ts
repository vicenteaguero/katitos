import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { usePartner, useUserId } from '@kernel/auth';
import type {
  Course,
  Lesson,
  LessonProgress,
  TargetLang,
  UnitWithLessons,
} from '../types';

/** Stable reference: an inline arrow re-runs `select` on every render. */
const progressByLesson = (rows: LessonProgress[]) => {
  const out = new Map<string, LessonProgress>();
  for (const row of rows) out.set(row.lesson_id, row);
  return out;
};

/** Every course, newest arrangement first. */
export function useCourses(target?: TargetLang) {
  return useQuery({
    queryKey: [...qk.lang.courses(), target ?? 'all'] as const,
    queryFn: async (): Promise<Course[]> => {
      let q = supabase.from('lang_courses').select('*').eq('archived', false);
      if (target) q = q.eq('target_lang', target);
      const { data, error } = await q
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCourse(id: string | undefined) {
  return useQuery({
    queryKey: qk.lang.course(id ?? 'none'),
    enabled: !!id,
    queryFn: async (): Promise<Course> => {
      const { data, error } = await supabase
        .from('lang_courses')
        .select('*')
        .eq('id', id as string)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * A course's units with their lessons inside, in the order she arranged them.
 *
 * One request, not one per unit: a course is small enough to read whole, and a
 * waterfall of requests is what made the old deck screen feel slow.
 */
export function useUnits(courseId: string | undefined) {
  const userId = useUserId();
  return useQuery({
    queryKey: [...qk.lang.units(courseId ?? 'none'), userId ?? 'anon'] as const,
    enabled: !!courseId,
    staleTime: 30_000,
    queryFn: async (): Promise<UnitWithLessons[]> => {
      const { data, error } = await supabase
        .from('lang_units')
        .select('*, lessons:lang_lessons(*)')
        .eq('course_id', courseId as string)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((u) => ({
        ...u,
        lessons: [...((u.lessons ?? []) as Lesson[])]
          // A draft belongs to whoever is writing it. The migration says "he
          // only ever sees published" and nothing enforced it — half-written
          // lessons appeared in his list and opened.
          .filter((l) => !l.deleted_at)
          .filter((l) => l.status === 'published' || l.created_by === userId)
          .sort((a, b) => a.position - b.position),
      }));
    },
  });
}

/**
 * How far along each of us is.
 *
 * Both rows come back, not just mine — she is the teacher and the whole point
 * is that she can see what he has handed in. Plain rows out of the queryFn; the
 * lookup is built in `select`, because a Map in cached data rehydrates from
 * localStorage as an empty object.
 */
export function useProgress() {
  return useQuery({
    queryKey: qk.lang.progress(),
    queryFn: async (): Promise<LessonProgress[]> => {
      const { data, error } = await supabase
        .from('lang_lesson_progress')
        .select('*');
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** My own progress, keyed by lesson. */
export function useMyProgress() {
  const userId = useUserId();
  return useQuery({
    queryKey: [...qk.lang.progress(), 'mine', userId ?? 'anon'] as const,
    enabled: !!userId,
    queryFn: async (): Promise<LessonProgress[]> => {
      const { data, error } = await supabase
        .from('lang_lesson_progress')
        .select('*')
        .eq('user_id', userId as string);
      if (error) throw error;
      return data ?? [];
    },
    select: progressByLesson,
  });
}

/**
 * What is waiting: published homework and exams with a due date, soonest first.
 *
 * Drives the home widget, so it is deliberately small and cheap.
 */
export function useDueLessons(target: TargetLang) {
  return useQuery({
    queryKey: [...qk.lang.progress(), 'due', target] as const,
    staleTime: 60_000,
    queryFn: async (): Promise<Lesson[]> => {
      // Only the language you are LEARNING. Without this the home screen told
      // him his own Spanish homework was due — the homework he set for her.
      // Filtered on the SERVER: filtering after the limit meant the twenty
      // oldest rows were mostly the other course's, and one person's widget
      // went blank as the other's history grew.
      const { data, error } = await supabase
        .from('lang_lessons')
        .select(
          '*, unit:lang_units!inner(course:lang_courses!inner(target_lang))'
        )
        .eq('unit.course.target_lang', target)
        .eq('status', 'published')
        .in('kind', ['homework', 'exam'])
        .not('due_on', 'is', null)
        .is('deleted_at', null)
        .order('due_on', { ascending: true })
        .limit(20);
      if (error) throw error;
      const rows = (data ?? []) as (Lesson & {
        unit: { course: { target_lang: string } | null } | null;
      })[];
      return rows.filter((l) => l.unit?.course?.target_lang === target);
    },
  });
}

/** A progress row with the lesson it is about, for her inbox. */
export interface PartnerProgressRow extends LessonProgress {
  lesson:
    | (Pick<
        Lesson,
        'id' | 'title' | 'kind' | 'status' | 'due_on' | 'deleted_at'
      > & {
        unit: {
          course_id: string;
          course: { target_lang: string } | null;
        } | null;
      })
    | null;
}

/**
 * Everything he has done in the courses, lesson by lesson.
 *
 * The inbox, the home screen and the "opened Tuesday 14:02" line under a
 * title all read this: his rows only, with the lesson joined so nothing has
 * to look it up.
 */
export function usePartnerProgress() {
  const { partner } = usePartner();
  const id = partner?.user_id;
  return useQuery({
    queryKey: [...qk.lang.progress(), 'partner', id ?? 'none'] as const,
    enabled: !!id,
    staleTime: 30_000,
    queryFn: async (): Promise<PartnerProgressRow[]> => {
      const { data, error } = await supabase
        .from('lang_lesson_progress')
        .select(
          '*, lesson:lang_lessons(id, title, kind, status, due_on, deleted_at, unit:lang_units(course_id, course:lang_courses(target_lang)))'
        )
        .eq('user_id', id as string)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as PartnerProgressRow[]).filter(
        (r) => r.lesson && !r.lesson.deleted_at
      );
    },
  });
}
