import type { BlockKind } from '../types';

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
}

export const LESSON_TEMPLATES: LessonTemplate[] = [
  { id: 'blank', title: 'Blank', hint: 'Start from nothing', blocks: [] },
  {
    id: 'words',
    title: 'New words',
    hint: 'A paragraph, the words, a paragraph',
    blocks: ['text', 'vocab', 'text'],
  },
  {
    id: 'grammar',
    title: 'A rule',
    hint: 'The rule, the table, examples, the words',
    blocks: ['text', 'table', 'text', 'vocab'],
  },
  {
    id: 'listening',
    title: 'Listening',
    hint: 'A note, the recording, the words',
    blocks: ['text', 'media', 'vocab'],
  },
];
