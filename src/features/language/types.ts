import type { Tables } from '@kernel/supabase';

/* ── The course ──────────────────────────────────────────────────────────── */

export type Course = Tables<'lang_courses'>;
export type Unit = Tables<'lang_units'>;
export type Lesson = Tables<'lang_lessons'>;
export type Block = Tables<'lang_blocks'>;
export type Vocab = Tables<'lang_vocab'>;
export type Exercise = Tables<'lang_exercises'>;
export type Attempt = Tables<'lang_attempts'>;
export type LessonProgress = Tables<'lang_lesson_progress'>;
export type Media = Tables<'lang_media'>;
export type Letter = Tables<'lang_alphabet'>;

/** A lesson to read, homework to hand in, or an exam to sit. */
export type LessonKind = 'lesson' | 'homework' | 'exam';
export type LessonStatus = 'draft' | 'published';
export type BlockKind = 'text' | 'vocab' | 'media' | 'exercise' | 'divider';
export type MediaKind = 'pdf' | 'doc' | 'image' | 'audio' | 'youtube' | 'link';

/** The eight ways she can ask him something. */
export type ExerciseKind =
  | 'choice'
  | 'multi'
  | 'type'
  | 'complete'
  | 'order'
  | 'match'
  | 'listen'
  | 'speak';

/* ── Languages ───────────────────────────────────────────────────────────── */

/** What is being taught. */
export type TargetLang = 'ru' | 'es' | 'en';
/**
 * The language the teaching is explained IN.
 *
 * This is the whole trilingual trick: one lesson, written once in Russian with
 * an English gloss, becomes a Spanish lesson the moment somebody fills in the
 * Spanish — and reads perfectly in English until they do.
 */
export type SupportLang = 'en' | 'es';

export const LANG_LABELS: Record<TargetLang, string> = {
  ru: 'Russian',
  es: 'Spanish',
  en: 'English',
};

export const SUPPORT_LABELS: Record<SupportLang, string> = {
  en: 'English',
  es: 'Español',
};

/* ── Shapes the screens actually want ────────────────────────────────────── */

export interface UnitWithLessons extends Unit {
  lessons: Lesson[];
}

export interface LessonFull extends Lesson {
  blocks: Block[];
  exercises: Exercise[];
}

/** A lesson row plus how far along this person is. */
export interface LessonWithProgress extends Lesson {
  progress: LessonProgress | null;
}
