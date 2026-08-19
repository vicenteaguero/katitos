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
export type BlockKind =
  | 'text'
  | 'vocab'
  | 'media'
  | 'exercise'
  | 'divider'
  | 'table';
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

/**
 * One of the three, in any role.
 *
 * There is no separate "target" and "support" type any more, and that was the
 * bug: making support `'en' | 'es'` quietly decided that Russian is always the
 * thing being taught and never the thing explaining. She is the one learning
 * Spanish, and she reads Russian.
 */
export type Lang = 'ru' | 'es' | 'en';

/** Kept as an alias so "the language this course teaches" still reads that way. */
export type TargetLang = Lang;

/** In English, for prose: "a course of Russian". */
export const LANG_LABELS: Record<Lang, string> = {
  ru: 'Russian',
  es: 'Spanish',
  en: 'English',
};

/** In its own language, for a control you tap. */
export const LANG_NATIVE_LABELS: Record<Lang, string> = {
  ru: 'Русский',
  es: 'Español',
  en: 'English',
};

/** A flag for a course row, and for the New course picker. */
export const LANG_FLAGS: Record<Lang, string> = {
  ru: '🇷🇺',
  es: '🇨🇱',
  en: '🇬🇧',
};

/* ── Shapes the screens actually want ────────────────────────────────────── */

export interface UnitWithLessons extends Unit {
  lessons: Lesson[];
}

export interface LessonFull extends Lesson {
  blocks: Block[];
  exercises: Exercise[];
  /** The language this lesson teaches, from its course. */
  targetLang: Lang;
  /** The course this lesson belongs to — two hops up, but everything needs it. */
  courseId: string;
  /** Files and links attached to this lesson, by id. */
  media: Media[];
  /** Words attached to each vocab block, keyed by block id. */
  vocabByBlock: Record<string, Vocab[]>;
}

/** What a `media` block stores in its `data` jsonb: which attachment it shows. */
export interface MediaBlockData {
  mediaId?: string;
}

/**
 * A declension or conjugation table.
 *
 * The cells are Russian forms — the thing being taught — so they are not
 * translated. Only the column headings are, which is why they carry the same
 * three-language shape as everything else.
 */
export interface TableBlockData {
  headings?: { ru?: string; en?: string; es?: string }[];
  rows?: string[][];
}

/** A lesson row plus how far along this person is. */
export interface LessonWithProgress extends Lesson {
  progress: LessonProgress | null;
}
