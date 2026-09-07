import {
  ClipboardCheck,
  FileText,
  Pencil,
  type LucideIcon,
} from 'lucide-react';
import type { LessonKind } from '../types';

/** What each kind of lesson is called on a row, and the glyph beside it. */
export const KIND_LABEL: Record<LessonKind, string> = {
  lesson: 'Lesson',
  homework: 'Homework',
  exam: 'Exam',
};

export const KIND_ICON: Record<LessonKind, LucideIcon> = {
  lesson: FileText,
  homework: Pencil,
  exam: ClipboardCheck,
};

export function kindLabel(kind: string): string {
  return KIND_LABEL[kind as LessonKind] ?? 'Lesson';
}

export function kindIcon(kind: string): LucideIcon {
  return KIND_ICON[kind as LessonKind] ?? FileText;
}
