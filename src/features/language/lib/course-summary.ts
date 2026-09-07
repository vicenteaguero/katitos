import type { LessonKind, LessonStatus, ProgressStatus } from '../types';

/** The little a course card needs to know about a lesson. */
export interface LessonLite {
  id: string;
  title: string;
  kind: LessonKind | string;
  status: LessonStatus | string;
  position: number;
  created_by: string | null;
  unit: { id: string; course_id: string; position: number } | null;
}

export interface ProgressLite {
  lesson_id: string;
  user_id: string;
  status: ProgressStatus | string;
}

/** One course, summed up for its card on the language home. */
export interface CourseSummary {
  /** Published lessons. */
  total: number;
  /** Of those, the ones I have been marked on. */
  doneMine: number;
  /** Of those, the ones my partner has been marked on. */
  donePartner: number;
  /** Handed in by my partner, waiting for my pen. */
  toMark: number;
  /** My own half-written lessons. */
  drafts: number;
  /** The next published lesson I have not finished, in course order. */
  next: { id: string; title: string } | null;
  /** Which unit that lesson is in, 1-based, and how many units there are. */
  unitIndex: number;
  unitCount: number;
}

const EMPTY: CourseSummary = {
  total: 0,
  doneMine: 0,
  donePartner: 0,
  toMark: 0,
  drafts: 0,
  next: null,
  unitIndex: 0,
  unitCount: 0,
};

/**
 * Sum every course up at once from two flat lists: the lessons (with the
 * unit they sit in) and everyone's progress rows. Pure, so the card copy
 * can be tested without a database.
 */
export function summariseCourses(
  lessons: LessonLite[],
  progress: ProgressLite[],
  userId: string | null | undefined,
  partnerId: string | null | undefined
): Map<string, CourseSummary> {
  const out = new Map<string, CourseSummary>();
  const mine = new Map<string, string>();
  const theirs = new Map<string, string>();
  for (const p of progress) {
    if (p.user_id === userId) mine.set(p.lesson_id, p.status);
    else if (p.user_id === partnerId) theirs.set(p.lesson_id, p.status);
  }

  const byCourse = new Map<string, LessonLite[]>();
  for (const l of lessons) {
    const id = l.unit?.course_id;
    if (!id) continue;
    const list = byCourse.get(id) ?? [];
    list.push(l);
    byCourse.set(id, list);
  }

  for (const [courseId, list] of byCourse) {
    const ordered = [...list].sort(
      (a, b) =>
        (a.unit?.position ?? 0) - (b.unit?.position ?? 0) ||
        a.position - b.position
    );
    const units = [...new Set(ordered.map((l) => l.unit?.id))];
    const published = ordered.filter((l) => l.status === 'published');
    const s: CourseSummary = {
      ...EMPTY,
      total: published.length,
      doneMine: published.filter((l) => mine.get(l.id) === 'graded').length,
      donePartner: published.filter((l) => theirs.get(l.id) === 'graded')
        .length,
      toMark: published.filter((l) => theirs.get(l.id) === 'submitted').length,
      drafts: ordered.filter(
        (l) => l.status === 'draft' && l.created_by === userId
      ).length,
      unitCount: units.length,
    };
    const next = published.find((l) => {
      const st = mine.get(l.id);
      return st !== 'graded' && st !== 'submitted';
    });
    if (next) {
      s.next = { id: next.id, title: next.title };
      s.unitIndex = units.indexOf(next.unit?.id) + 1;
    }
    out.set(courseId, s);
  }
  return out;
}
