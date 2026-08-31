import type { Attempt } from '../types';

export interface Verdict {
  correct: boolean;
  /** Out of one. */
  score: number;
  /** She decided, not the app. */
  hers: boolean;
}

/** What counts: her tick beats the app's, once she has given one. */
export function verdictOf(
  attempt:
    | Pick<Attempt, 'correct' | 'score' | 'teacher_score'>
    | null
    | undefined
): Verdict | null {
  if (!attempt) return null;
  if (attempt.teacher_score != null) {
    return {
      correct: attempt.teacher_score >= 1,
      score: attempt.teacher_score,
      hers: true,
    };
  }
  return {
    correct: !!attempt.correct,
    score: attempt.score ?? (attempt.correct ? 1 : 0),
    hers: false,
  };
}

/**
 * The lesson's score out of one, weighted by the points on each question.
 *
 * A one-point warm-up and a five-point translation used to count the same;
 * `points` had been on the table since the start and nothing read it. A
 * question with no score yet counts as asked and missed.
 */
export function weightedScore(
  rows: { points?: number | null; score: number | null | undefined }[]
): number | null {
  let total = 0;
  let earned = 0;
  for (const r of rows) {
    const p = r.points && r.points > 0 ? r.points : 1;
    total += p;
    earned += p * (r.score ?? 0);
  }
  return total > 0 ? earned / total : null;
}
