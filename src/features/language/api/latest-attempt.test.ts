import { describe, expect, it } from 'vitest';
import { latestPerExercise } from './lessons.queries';
import type { Attempt } from '../types';

const attempt = (over: Partial<Attempt>): Attempt =>
  ({
    id: 'a',
    exercise_id: 'x',
    user_id: 'u',
    attempt_no: 1,
    answer: null,
    correct: null,
    score: null,
    answered_at: '2026-08-19T00:00:00Z',
    ...over,
  }) as Attempt;

/**
 * "Where was I" in a lesson.
 *
 * Attempts are append-only so homework can be redone, which means the screen
 * has to pick the newest row per question. It is right only because the query
 * orders `answered_at` descending — reverse that and he'd be shown his first,
 * usually wrong, answer forever.
 */
describe('latestPerExercise', () => {
  it('keeps the newest attempt for each question', () => {
    const out = latestPerExercise([
      attempt({ id: 'newer', exercise_id: 'q1', attempt_no: 2 }),
      attempt({ id: 'older', exercise_id: 'q1', attempt_no: 1 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('newer');
  });

  it('keeps one per question, not one overall', () => {
    const out = latestPerExercise([
      attempt({ id: 'q1-new', exercise_id: 'q1' }),
      attempt({ id: 'q2-new', exercise_id: 'q2' }),
      attempt({ id: 'q1-old', exercise_id: 'q1' }),
    ]);
    expect(out.map((a) => a.id).sort()).toEqual(['q1-new', 'q2-new']);
  });

  it('is empty when he has not answered anything', () => {
    expect(latestPerExercise([])).toEqual([]);
  });

  it('takes the FIRST row it sees per question — the query orders them', () => {
    // Feeding them oldest-first proves the dependency rather than hiding it:
    // this function trusts the caller's ordering, and that is worth pinning.
    const out = latestPerExercise([
      attempt({ id: 'first-seen', exercise_id: 'q1', attempt_no: 1 }),
      attempt({ id: 'second-seen', exercise_id: 'q1', attempt_no: 2 }),
    ]);
    expect(out[0].id).toBe('first-seen');
  });
});
