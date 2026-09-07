import { describe, expect, it } from 'vitest';
import { summariseCourses, type LessonLite } from './course-summary';

const unit = (id: string, position: number) => ({
  id,
  course_id: 'ru',
  position,
});
const lesson = (
  id: string,
  u: ReturnType<typeof unit>,
  position: number,
  status = 'published',
  created_by = 'her'
): LessonLite => ({
  id,
  title: id,
  kind: 'lesson',
  status,
  position,
  created_by,
  unit: u,
});

const u1 = unit('u1', 0);
const u2 = unit('u2', 1);
const lessons = [
  lesson('greetings', u1, 0),
  lesson('cafe', u1, 1),
  lesson('numbers', u1, 2, 'draft'),
  lesson('exam', u2, 0),
];

describe('summariseCourses', () => {
  it('counts published lessons, what I finished, and where I am', () => {
    const s = summariseCourses(
      lessons,
      [{ lesson_id: 'greetings', user_id: 'him', status: 'graded' }],
      'him',
      'her'
    ).get('ru')!;
    expect(s.total).toBe(3);
    expect(s.doneMine).toBe(1);
    expect(s.next).toEqual({ id: 'cafe', title: 'cafe' });
    expect(s.unitIndex).toBe(1);
    expect(s.unitCount).toBe(2);
    expect(s.drafts).toBe(0);
  });

  it('skips what I handed in, and moves on to the next unit', () => {
    const s = summariseCourses(
      lessons,
      [
        { lesson_id: 'greetings', user_id: 'him', status: 'graded' },
        { lesson_id: 'cafe', user_id: 'him', status: 'submitted' },
      ],
      'him',
      'her'
    ).get('ru')!;
    expect(s.next?.id).toBe('exam');
    expect(s.unitIndex).toBe(2);
  });

  it('tells the teacher her drafts and what is waiting for her pen', () => {
    const s = summariseCourses(
      lessons,
      [
        { lesson_id: 'greetings', user_id: 'him', status: 'graded' },
        { lesson_id: 'cafe', user_id: 'him', status: 'submitted' },
      ],
      'her',
      'him'
    ).get('ru')!;
    expect(s.drafts).toBe(1);
    expect(s.toMark).toBe(1);
    expect(s.donePartner).toBe(1);
  });

  it('leaves out a lesson with no unit', () => {
    const s = summariseCourses(
      [{ ...lesson('loose', u1, 0), unit: null }],
      [],
      'him',
      'her'
    );
    expect(s.size).toBe(0);
  });
});
