import type { BlockKind, LessonKind } from '../types';

/**
 * A lesson's first shape, so the page is never blank.
 *
 * Nothing clever: the blocks a kind of lesson usually starts with, empty,
 * in order. She fills them in and throws away what she does not need.
 */
export interface LessonTemplate {
  id: string;
  title: string;
  hint: string;
  blocks: BlockKind[];
  /** Which kinds of lesson it is offered for. */
  for: LessonKind[];
}

export const LESSON_TEMPLATES: LessonTemplate[] = [
  {
    id: 'blank',
    title: 'Blank',
    hint: 'Start from nothing',
    blocks: [],
    for: ['lesson', 'homework', 'exam'],
  },
  {
    id: 'words',
    title: 'New words',
    hint: 'A paragraph, the words, a paragraph',
    blocks: ['text', 'vocab', 'text'],
    for: ['lesson'],
  },
  {
    id: 'grammar',
    title: 'A rule',
    hint: 'The rule, the table, examples, the words',
    blocks: ['text', 'table', 'text', 'vocab'],
    for: ['lesson'],
  },
  {
    id: 'listening',
    title: 'Listening',
    hint: 'A note, the recording, the words',
    blocks: ['text', 'media', 'vocab'],
    for: ['lesson'],
  },
  {
    id: 'homework',
    title: 'Homework',
    hint: 'A note, the words to practise — then your questions',
    blocks: ['text', 'vocab'],
    for: ['homework'],
  },
  {
    id: 'exam',
    title: 'Exam',
    hint: 'One note, then only questions',
    blocks: ['text'],
    for: ['exam'],
  },
];

/** The first sheet a kind of lesson gets — the one she would pick anyway. */
export function defaultTemplateFor(kind: LessonKind): string {
  return kind === 'homework' ? 'homework' : kind === 'exam' ? 'exam' : 'words';
}
