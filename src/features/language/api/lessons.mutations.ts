import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { usePartner, useUserId } from '@kernel/auth';
import { notifyPartner } from '@kernel/push';
import { isAsleep } from '../lib/quiet';
import type { ProgressStatus } from '../types';
import { toast } from '@kernel/ui';
import type { Json } from '@kernel/supabase';
import type {
  Block,
  BlockKind,
  Exercise,
  ExerciseKind,
  Lang,
  LessonFull,
  LessonKind,
  LessonStatus,
} from '../types';
import { gradeAnswer, type ExerciseLike } from '../lib/exercise-schema';
import type { HomeworkSpec } from '../lib/homework';

/** The column a prompt in `lang` goes into. */
function promptColumn(lang: Lang, text: string | null) {
  if (lang === 'ru') return { prompt_ru: text };
  if (lang === 'es') return { prompt_es: text };
  return { prompt_en: text };
}

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
      /** A template's first shape: the blocks to start with, empty, in order. */
      blocks?: BlockKind[];
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
      if (v.blocks?.length) {
        const { error: blockErr } = await supabase.from('lang_blocks').insert(
          v.blocks.map((kind, position) => ({
            lesson_id: data.id as string,
            kind,
            position,
          }))
        );
        if (blockErr) throw blockErr;
      }
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
  const { partner } = usePartner();
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
      /** Buzz him even if it is night where he is. */
      wake?: boolean;
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

      // Not at three in the morning his time, unless she says so — a held
      // push is not lost, the lesson is on his home screen when he wakes.
      if (
        v.status === 'published' &&
        !v.wasPublished &&
        (v.wake || !isAsleep(partner?.timezone))
      ) {
        void notifyPartner({
          kind: 'lesson',
          tag: `lesson:${v.id}`,
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

/**
 * Put a lesson away.
 *
 * Not a delete: deleting the row took every block, every question, every
 * answer he ever gave and every mark she ever wrote with it. The row is
 * marked and leaves the course; Undo unmarks it.
 */
export function useDeleteLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; courseId: string }) => {
      const { error } = await supabase
        .from('lang_lessons')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', v.id);
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.units(v.courseId) }),
  });
}

/** Bring a lesson back, exactly as it was. */
export function useRestoreLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; courseId: string }) => {
      const { error } = await supabase
        .from('lang_lessons')
        .update({ deleted_at: null })
        .eq('id', v.id);
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.units(v.courseId) }),
  });
}

/** Rename a unit. */
export function useUpdateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; courseId: string; title: string }) => {
      const { error } = await supabase
        .from('lang_units')
        .update({ title: v.title.trim() })
        .eq('id', v.id);
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.units(v.courseId) }),
  });
}

/**
 * Delete an EMPTY unit. A unit with lessons in it cascades to every one of
 * them, answers and marks included, so the caller moves them out first.
 */
export function useDeleteUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; courseId: string }) => {
      const { count, error: countErr } = await supabase
        .from('lang_lessons')
        .select('id', { count: 'exact', head: true })
        .eq('unit_id', v.id)
        .is('deleted_at', null);
      if (countErr) throw countErr;
      if (count) throw new Error('Move its lessons somewhere first');
      const { error } = await supabase
        .from('lang_units')
        .delete()
        .eq('id', v.id);
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.units(v.courseId) }),
  });
}

/** Positions written for a list of ids, in order. */
async function writePositions(
  table: 'lang_units' | 'lang_lessons' | 'lang_blocks' | 'lang_exercises',
  ids: string[]
) {
  // Supabase builders RESOLVE with `{error}` rather than rejecting, so
  // without this a refused reorder reported success and the list silently
  // snapped back.
  const results = await Promise.all(
    ids.map((id, position) =>
      supabase.from(table).update({ position }).eq('id', id)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

/** Re-order the units of a course. */
export function useReorderUnits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { courseId: string; ids: string[] }) =>
      writePositions('lang_units', v.ids),
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.units(v.courseId) }),
  });
}

/** Re-order the lessons inside a unit. */
export function useReorderLessons() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { courseId: string; ids: string[] }) =>
      writePositions('lang_lessons', v.ids),
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.units(v.courseId) }),
  });
}

/**
 * A whole lesson again, as a draft, at the end of its unit.
 *
 * Blocks, the words each block teaches, the questions with their blocks
 * re-pointed at the copies. Attachments are shared, not copied: a media
 * block keeps pointing at the same worksheet, which the course's library
 * owns.
 */
export function useDuplicateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { lesson: LessonFull; position: number }) => {
      const src = v.lesson;
      const { data: made, error } = await supabase
        .from('lang_lessons')
        .insert({
          unit_id: src.unit_id,
          title: `${src.title} (copy)`,
          subtitle: src.subtitle,
          kind: src.kind,
          position: v.position,
          status: 'draft',
          est_minutes: src.est_minutes,
        })
        .select('id')
        .single();
      if (error) throw error;
      const lessonId = made.id as string;

      const blockIds = new Map<string, string>();
      for (const b of src.blocks) blockIds.set(b.id, crypto.randomUUID());
      if (src.blocks.length) {
        const { error: bErr } = await supabase.from('lang_blocks').insert(
          src.blocks.map((b) => ({
            id: blockIds.get(b.id)!,
            lesson_id: lessonId,
            position: b.position,
            kind: b.kind,
            body_ru: b.body_ru,
            body_en: b.body_en,
            body_es: b.body_es,
            data: b.data as never,
          }))
        );
        if (bErr) throw bErr;
      }
      for (const b of src.blocks) {
        const words = src.vocabByBlock[b.id];
        if (!words?.length) continue;
        const { error: wErr } = await supabase.rpc('set_block_vocab', {
          p_block: blockIds.get(b.id)!,
          p_vocab: words.map((w) => w.id),
        });
        if (wErr) throw wErr;
      }
      if (src.exercises.length) {
        const { error: eErr } = await supabase.from('lang_exercises').insert(
          src.exercises.map((ex) => ({
            lesson_id: lessonId,
            block_id: ex.block_id ? (blockIds.get(ex.block_id) ?? null) : null,
            kind: ex.kind,
            position: ex.position,
            prompt_ru: ex.prompt_ru,
            prompt_en: ex.prompt_en,
            prompt_es: ex.prompt_es,
            payload: ex.payload as never,
            answer: ex.answer as never,
            points: ex.points,
          }))
        );
        if (eErr) throw eErr;
      }
      return lessonId;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.units(v.lesson.courseId) }),
  });
}

/**
 * Homework written for her, from a lesson's words.
 *
 * The questions come from `homeworkFrom`; this only files them: a draft
 * homework at the end of the unit, every question in the language she
 * explains in.
 */
export function useCreateHomework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      courseId: string;
      unitId: string;
      title: string;
      position: number;
      support: Lang;
      specs: HomeworkSpec[];
    }) => {
      const { data, error } = await supabase
        .from('lang_lessons')
        .insert({
          unit_id: v.unitId,
          title: v.title,
          kind: 'homework',
          position: v.position,
          status: 'draft',
        })
        .select('id')
        .single();
      if (error) throw error;
      if (v.specs.length) {
        const { error: eErr } = await supabase.from('lang_exercises').insert(
          v.specs.map((q, position) => ({
            lesson_id: data.id as string,
            kind: q.kind,
            position,
            payload: q.payload as never,
            answer: q.answer as never,
            ...promptColumn(v.support, q.prompt),
          }))
        );
        if (eErr) throw eErr;
      }
      return data.id as string;
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
    // Optimistic: the text she just typed is the truth of the page, and every
    // blur used to re-run the lesson's three round-trips before showing it.
    onMutate: async (v) => {
      const key = qk.lang.lesson(v.lessonId);
      await qc.cancelQueries({ queryKey: key });
      const before = qc.getQueryData<LessonFull>(key);
      if (before) {
        const blocks = before.blocks
          .map((b) =>
            b.id === v.id ? { ...b, ...(v.patch as Partial<Block>) } : b
          )
          .sort((a, b) => a.position - b.position);
        qc.setQueryData<LessonFull>(key, { ...before, blocks });
      }
      return { before };
    },
    onError: (e: Error, v, ctx) => {
      if (ctx?.before) qc.setQueryData(qk.lang.lesson(v.lessonId), ctx.before);
      toast.error(e.message);
    },
    // Only a change of SHAPE needs the server's view back; a body edit is
    // already on screen, and the realtime sync reconciles it in the background.
    onSuccess: (_d, v) => {
      if (v.patch.position !== undefined || v.patch.data !== undefined)
        void qc.invalidateQueries({ queryKey: qk.lang.lesson(v.lessonId) });
    },
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

/**
 * Put a deleted block back, exactly as it was — its own id, its text, its
 * table, and the words it taught.
 *
 * This is what makes deleting safe with one tap: the toast's Undo has nine
 * seconds to call it. Blocks do not soft-delete the way words do because a
 * block that is gone from the page is gone from everything.
 */
export function useRestoreBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      block: Block;
      vocabIds: string[];
      lessonId: string;
    }) => {
      const { error } = await supabase.from('lang_blocks').insert({
        id: v.block.id,
        lesson_id: v.block.lesson_id,
        position: v.block.position,
        kind: v.block.kind,
        body_ru: v.block.body_ru,
        body_en: v.block.body_en,
        body_es: v.block.body_es,
        data: v.block.data as never,
      });
      if (error) throw error;
      if (v.vocabIds.length) {
        const { error: linkErr } = await supabase.rpc('set_block_vocab', {
          p_block: v.block.id,
          p_vocab: v.vocabIds,
        });
        if (linkErr) throw linkErr;
      }
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.lesson(v.lessonId) }),
  });
}

/** A block again, right under itself — words and all. */
export function useDuplicateBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      block: Block;
      vocabIds: string[];
      lessonId: string;
      /** Every block id in order, so the copy can be slotted in after its source. */
      order: string[];
    }) => {
      const id = crypto.randomUUID();
      const { error } = await supabase.from('lang_blocks').insert({
        id,
        lesson_id: v.lessonId,
        position: v.block.position + 1,
        kind: v.block.kind,
        body_ru: v.block.body_ru,
        body_en: v.block.body_en,
        body_es: v.block.body_es,
        data: v.block.data as never,
      });
      if (error) throw error;
      if (v.vocabIds.length) {
        const { error: wErr } = await supabase.rpc('set_block_vocab', {
          p_block: id,
          p_vocab: v.vocabIds,
        });
        if (wErr) throw wErr;
      }
      const at = v.order.indexOf(v.block.id);
      const next = [...v.order];
      next.splice(at + 1, 0, id);
      await writePositions('lang_blocks', next);
      return id;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.lesson(v.lessonId) }),
  });
}

/** Re-order the blocks of a lesson after a drag. */
/** Questions move too — within their block, or among the ones at the end. */
export function useReorderExercises() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { lessonId: string; ids: string[] }) =>
      writePositions('lang_exercises', v.ids),
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.lesson(v.lessonId) }),
  });
}

export function useReorderBlocks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { lessonId: string; ids: string[] }) =>
      writePositions('lang_blocks', v.ids),
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
      /** How much it is worth, out of the lesson. 1 unless she says otherwise. */
      points?: number;
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
              ...(v.points !== undefined ? { points: v.points } : {}),
              ...(v.blockId !== undefined ? { block_id: v.blockId } : {}),
              ...prompts,
            })
            .eq('id', v.id)
        : await supabase.from('lang_exercises').insert({
            lesson_id: v.lessonId,
            block_id: v.blockId ?? null,
            kind: v.kind,
            position: v.position,
            points: v.points ?? 1,
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

/** A question again, at the end of its block's list. */
export function useDuplicateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      exercise: Exercise;
      lessonId: string;
      position: number;
    }) => {
      const ex = v.exercise;
      const { error } = await supabase.from('lang_exercises').insert({
        lesson_id: ex.lesson_id,
        block_id: ex.block_id,
        kind: ex.kind,
        position: v.position,
        prompt_ru: ex.prompt_ru,
        prompt_en: ex.prompt_en,
        prompt_es: ex.prompt_es,
        payload: ex.payload as never,
        answer: ex.answer as never,
        points: ex.points,
      });
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.lesson(v.lessonId) }),
  });
}

/** Put a deleted question back, id and all, for the Undo in the toast. */
export function useRestoreExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { exercise: Exercise; lessonId: string }) => {
      const ex = v.exercise;
      const { error } = await supabase.from('lang_exercises').insert({
        id: ex.id,
        lesson_id: ex.lesson_id,
        block_id: ex.block_id,
        kind: ex.kind,
        position: ex.position,
        prompt_ru: ex.prompt_ru,
        prompt_en: ex.prompt_en,
        prompt_es: ex.prompt_es,
        payload: ex.payload as never,
        answer: ex.answer as never,
        points: ex.points,
        media_id: ex.media_id,
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

/**
 * Hand in several answers at once.
 *
 * An exam is one act. It used to be one request per question, each with its
 * own refetch, and the screen said "Handed in" before any of them had landed.
 */
export function useAnswerExercises() {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: async (v: {
      lessonId: string;
      answers: {
        exercise: ExerciseLike & { id: string };
        answer: unknown;
        attemptNo: number;
      }[];
    }) => {
      const marks = v.answers.map((a) => ({
        exerciseId: a.exercise.id,
        grade: gradeAnswer(a.exercise, a.answer),
      }));
      const rows = v.answers.map((a, i) => ({
        exercise_id: a.exercise.id,
        answer: a.answer as never,
        correct: marks[i].grade.correct,
        score: marks[i].grade.score,
        attempt_no: a.attemptNo,
        ...(userId ? { user_id: userId } : {}),
      }));
      if (rows.length) {
        const { error } = await supabase.from('lang_attempts').insert(rows);
        if (error) throw error;
      }
      return marks;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.attempts(v.lessonId) }),
  });
}

/**
 * Where a lesson stands for one of us — and the push that closes the loop.
 *
 * Every state change funnels through here, so this is the one place that
 * tells the other phone: his hand-in reaches her, her mark or "have another
 * go" reaches him. Not at night, their time, unless `wake` says so; a held
 * push is not lost — the thing it was about is on the home screen.
 */
export function useSaveProgress() {
  const qc = useQueryClient();
  const userId = useUserId();
  const { partner } = usePartner();
  return useMutation({
    mutationFn: async (v: {
      lessonId: string;
      status: Exclude<ProgressStatus, 'not_started'>;
      score?: number | null;
      teacherNote?: string | null;
      /** Her voice on the whole lesson, already uploaded. */
      teacherAudioPath?: string | null;
      forUserId?: string;
      /** The lesson's title — with it, the other phone is told. */
      title?: string;
      /** Buzz them even if it is night where they are. */
      wake?: boolean;
    }) => {
      const row: {
        lesson_id: string;
        user_id?: string;
        status: string;
        score?: number | null;
        teacher_note?: string | null;
        teacher_audio_path?: string | null;
        submitted_at?: string;
        graded_at?: string;
      } = {
        lesson_id: v.lessonId,
        user_id: v.forUserId ?? userId ?? undefined,
        status: v.status,
      };
      if (v.score !== undefined) row.score = v.score;
      if (v.teacherNote !== undefined) row.teacher_note = v.teacherNote;
      if (v.teacherAudioPath !== undefined)
        row.teacher_audio_path = v.teacherAudioPath;
      if (v.status === 'submitted') row.submitted_at = new Date().toISOString();
      if (v.status === 'graded') row.graded_at = new Date().toISOString();
      const { error } = await supabase
        .from('lang_lesson_progress')
        .upsert(row as never, { onConflict: 'lesson_id,user_id' });
      if (error) throw error;

      if (!v.title || v.status === 'in_progress') return;
      if (isAsleep(partner?.timezone) && !v.wake) return;
      const pct = v.score != null ? ` · ${Math.round(v.score * 100)}%` : '';
      const [title, body, url] =
        v.status === 'submitted'
          ? ['Handed in', v.title, `/language/mark/${v.lessonId}`]
          : v.status === 'graded'
            ? [
                `Marked${pct}`,
                v.teacherNote ||
                  (v.teacherAudioPath
                    ? 'With a word from her, out loud'
                    : v.title),
                `/language/lesson/${v.lessonId}`,
              ]
            : [
                'Sent back for another go',
                v.teacherNote || v.title,
                `/language/lesson/${v.lessonId}`,
              ];
      void notifyPartner({
        kind: 'lesson',
        title,
        body,
        url,
        tag: `lesson:${v.lessonId}`,
      });
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: qk.lang.progress() }),
  });
}

/**
 * He opened it.
 *
 * A quiet row so she knows he has seen the lesson before the call — only
 * `opened_at` is sent, so a row that already says "handed in" keeps saying
 * it; a lesson he has never touched gets a `not_started` row with a time on it.
 */
export function useMarkOpened() {
  const qc = useQueryClient();
  const userId = useUserId();
  return useMutation({
    mutationFn: async (lessonId: string) => {
      if (!userId) return;
      const { error } = await supabase.from('lang_lesson_progress').upsert(
        {
          lesson_id: lessonId,
          user_id: userId,
          opened_at: new Date().toISOString(),
        },
        { onConflict: 'lesson_id,user_id' }
      );
      if (error) throw error;
    },
    // Bookkeeping, not something he did: no toast on failure.
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: qk.lang.progress() }),
  });
}

/** Her tick, her cross, or a word in the margin — on one of his answers. */
export function useMarkAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      id: string;
      lessonId: string;
      /** 1 right, 0 wrong, null back to the app's verdict. */
      teacherScore?: number | null;
      teacherNote?: string | null;
      /** Her voice on this one answer, already uploaded. */
      teacherAudioPath?: string | null;
    }) => {
      const patch: {
        teacher_score?: number | null;
        teacher_note?: string | null;
        teacher_audio_path?: string | null;
      } = {};
      if (v.teacherScore !== undefined) patch.teacher_score = v.teacherScore;
      if (v.teacherNote !== undefined) patch.teacher_note = v.teacherNote;
      if (v.teacherAudioPath !== undefined)
        patch.teacher_audio_path = v.teacherAudioPath;
      const { error } = await supabase
        .from('lang_attempts')
        .update(patch)
        .eq('id', v.id);
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.attempts(v.lessonId) }),
  });
}
