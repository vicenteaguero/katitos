import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { useUserId } from '@kernel/auth';
import { notifyPartner } from '@kernel/push';
import { toast } from '@kernel/ui';
import type { Json } from '@kernel/supabase';
import type {
  BlockKind,
  ExerciseKind,
  LessonKind,
  LessonStatus,
} from '../types';
import { gradeAnswer, type ExerciseLike } from '../lib/exercise-schema';

/* ── Building a course ───────────────────────────────────────────────────── */

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      title: string;
      targetLang: string;
      emoji?: string | null;
      description?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('lang_courses')
        .insert({
          title: v.title.trim(),
          target_lang: v.targetLang,
          emoji: v.emoji ?? null,
          description: v.description ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.lang.courses() }),
  });
}

export function useCreateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      courseId: string;
      title: string;
      position: number;
    }) => {
      const { data, error } = await supabase
        .from('lang_units')
        .insert({
          course_id: v.courseId,
          title: v.title.trim(),
          position: v.position,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.units(v.courseId) }),
  });
}

export function useCreateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      courseId: string;
      unitId: string;
      title: string;
      kind: LessonKind;
      position: number;
    }) => {
      const { data, error } = await supabase
        .from('lang_lessons')
        .insert({
          unit_id: v.unitId,
          title: v.title.trim(),
          kind: v.kind,
          position: v.position,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.units(v.courseId) }),
  });
}

/**
 * Change a lesson — including publishing it.
 *
 * Publishing homework is the one edit that reaches out of the app: he has no
 * reason to keep checking, so the app tells him once, and only when the thing
 * actually becomes visible to him.
 */
export function useUpdateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      id: string;
      courseId?: string;
      title?: string;
      subtitle?: string | null;
      kind?: LessonKind;
      status?: LessonStatus;
      dueOn?: string | null;
      estMinutes?: number | null;
      /** Was it already published before this edit? */
      wasPublished?: boolean;
    }) => {
      const patch: {
        title?: string;
        subtitle?: string | null;
        kind?: LessonKind;
        status?: LessonStatus;
        due_on?: string | null;
        est_minutes?: number | null;
      } = {};
      if (v.title !== undefined) patch.title = v.title.trim();
      if (v.subtitle !== undefined) patch.subtitle = v.subtitle;
      if (v.kind !== undefined) patch.kind = v.kind;
      if (v.status !== undefined) patch.status = v.status;
      if (v.dueOn !== undefined) patch.due_on = v.dueOn || null;
      if (v.estMinutes !== undefined) patch.est_minutes = v.estMinutes;
      const { data, error } = await supabase
        .from('lang_lessons')
        .update(patch)
        .eq('id', v.id)
        .select('title, kind, status')
        .single();
      if (error) throw error;

      if (v.status === 'published' && !v.wasPublished) {
        void notifyPartner({
          kind: 'lesson',
          title:
            data.kind === 'exam'
              ? 'An exam is waiting'
              : data.kind === 'homework'
                ? 'New homework'
                : 'A new lesson',
          body: data.title,
          url: `/language/lesson/${v.id}`,
        });
      }
      return data;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: qk.lang.lesson(v.id) });
      if (v.courseId)
        void qc.invalidateQueries({ queryKey: qk.lang.units(v.courseId) });
    },
  });
}

export function useDeleteLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; courseId: string }) => {
      const { error } = await supabase
        .from('lang_lessons')
        .delete()
        .eq('id', v.id);
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.units(v.courseId) }),
  });
}

/* ── Blocks ──────────────────────────────────────────────────────────────── */

export function useCreateBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      lessonId: string;
      kind: BlockKind;
      position: number;
    }) => {
      const { data, error } = await supabase
        .from('lang_blocks')
        .insert({ lesson_id: v.lessonId, kind: v.kind, position: v.position })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.lesson(v.lessonId) }),
  });
}

export function useUpdateBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      id: string;
      lessonId: string;
      patch: {
        body_ru?: string | null;
        body_en?: string | null;
        body_es?: string | null;
        position?: number;
        data?: Json;
      };
    }) => {
      const { error } = await supabase
        .from('lang_blocks')
        .update(v.patch)
        .eq('id', v.id);
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.lesson(v.lessonId) }),
  });
}

export function useDeleteBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; lessonId: string }) => {
      const { error } = await supabase
        .from('lang_blocks')
        .delete()
        .eq('id', v.id);
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.lesson(v.lessonId) }),
  });
}

/** Re-order the blocks of a lesson after a drag. */
export function useReorderBlocks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { lessonId: string; ids: string[] }) => {
      // Supabase builders RESOLVE with `{error}` rather than rejecting, so
      // without this a refused reorder reported success and the list silently
      // snapped back.
      const results = await Promise.all(
        v.ids.map((id, position) =>
          supabase.from('lang_blocks').update({ position }).eq('id', id)
        )
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.lesson(v.lessonId) }),
  });
}

/* ── Exercises ───────────────────────────────────────────────────────────── */

export function useSaveExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      id?: string;
      lessonId: string;
      blockId?: string | null;
      kind: ExerciseKind;
      position: number;
      prompt_ru?: string | null;
      prompt_en?: string | null;
      prompt_es?: string | null;
      payload: unknown;
      answer: unknown;
    }) => {
      // Only the languages the editor actually sent. Writing all three on an
      // update wiped whichever prompt she wasn't looking at: write the Spanish
      // and the English was gone, and `prompt_ru` could never be written at
      // all. Same shape as `useUpdateLesson`.
      const prompts: Record<string, string | null> = {};
      if (v.prompt_ru !== undefined) prompts.prompt_ru = v.prompt_ru;
      if (v.prompt_en !== undefined) prompts.prompt_en = v.prompt_en;
      if (v.prompt_es !== undefined) prompts.prompt_es = v.prompt_es;

      const { error } = v.id
        ? await supabase
            .from('lang_exercises')
            .update({
              kind: v.kind,
              position: v.position,
              payload: v.payload as never,
              answer: v.answer as never,
              ...prompts,
            })
            .eq('id', v.id)
        : await supabase.from('lang_exercises').insert({
            lesson_id: v.lessonId,
            block_id: v.blockId ?? null,
            kind: v.kind,
            position: v.position,
            payload: v.payload as never,
            answer: v.answer as never,
            prompt_ru: null,
            prompt_en: null,
            prompt_es: null,
            ...prompts,
          });
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.lesson(v.lessonId) }),
  });
}

export function useDeleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; lessonId: string }) => {
      const { error } = await supabase
        .from('lang_exercises')
        .delete()
        .eq('id', v.id);
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.lesson(v.lessonId) }),
  });
}

/* ── Doing the work ──────────────────────────────────────────────────────── */

/**
 * Answer one exercise.
 *
 * Marked here, on the device, against the same pure function the tests cover —
 * so the verdict is instant and the stored row already knows whether it was
 * right. Nothing is overwritten: every attempt is kept, which is what makes
 * "you got this wrong twice" possible later.
 */
export function useAnswerExercise() {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: async (v: {
      exercise: ExerciseLike & { id: string };
      lessonId: string;
      answer: unknown;
      attemptNo: number;
    }) => {
      const grade = gradeAnswer(v.exercise, v.answer);
      const { error } = await supabase.from('lang_attempts').insert({
        exercise_id: v.exercise.id,
        answer: v.answer as never,
        correct: grade.correct,
        score: grade.score,
        attempt_no: v.attemptNo,
        ...(userId ? { user_id: userId } : {}),
      });
      if (error) throw error;
      return grade;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.attempts(v.lessonId) }),
  });
}

/** Where he is in a lesson, and what it ended up being worth. */
export function useSaveProgress() {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: async (v: {
      lessonId: string;
      status: 'in_progress' | 'submitted' | 'graded';
      score?: number | null;
      teacherNote?: string | null;
      forUserId?: string;
    }) => {
      const row: {
        lesson_id: string;
        user_id?: string;
        status: string;
        score?: number | null;
        teacher_note?: string | null;
        submitted_at?: string;
        graded_at?: string;
      } = {
        lesson_id: v.lessonId,
        user_id: v.forUserId ?? userId ?? undefined,
        status: v.status,
      };
      if (v.score !== undefined) row.score = v.score;
      if (v.teacherNote !== undefined) row.teacher_note = v.teacherNote;
      if (v.status === 'submitted') row.submitted_at = new Date().toISOString();
      if (v.status === 'graded') row.graded_at = new Date().toISOString();
      const { error } = await supabase
        .from('lang_lesson_progress')
        .upsert(row as never, { onConflict: 'lesson_id,user_id' });
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: qk.lang.progress() }),
  });
}
