import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { useUserId } from '@kernel/auth';
import type {
  Course,
  Lesson,
  LessonProgress,
  TargetLang,
  UnitWithLessons,
} from '../types';

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
  return useQuery({
    queryKey: qk.lang.units(courseId ?? 'none'),
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
        lessons: [...((u.lessons ?? []) as Lesson[])].sort(
          (a, b) => a.position - b.position
        ),
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
    select: (rows) => {
      const out = new Map<string, LessonProgress>();
      for (const row of rows) out.set(row.lesson_id, row);
      return out;
    },
  });
}

/**
 * What is waiting: published homework and exams with a due date, soonest first.
 *
 * Drives the home widget, so it is deliberately small and cheap.
 */
export function useDueLessons() {
  return useQuery({
    queryKey: [...qk.lang.progress(), 'due'] as const,
    staleTime: 60_000,
    queryFn: async (): Promise<Lesson[]> => {
      const { data, error } = await supabase
        .from('lang_lessons')
        .select('*')
        .eq('status', 'published')
        .in('kind', ['homework', 'exam'])
        .not('due_on', 'is', null)
        .order('due_on', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });
}
