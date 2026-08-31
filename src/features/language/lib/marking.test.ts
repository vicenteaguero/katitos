import { describe, expect, it } from 'vitest';
import { verdictOf, weightedScore } from './marking';

describe('weightedScore', () => {
  it('is the mean when every question is worth the same', () => {
    expect(
      weightedScore([
        { points: 1, score: 1 },
        { points: 1, score: 0 },
      ])
    ).toBe(0.5);
  });

  it('lets a five-point translation outweigh a one-point warm-up', () => {
    expect(
      weightedScore([
        { points: 1, score: 0 },
        { points: 5, score: 1 },
      ])
    ).toBeCloseTo(5 / 6);
  });

  it('counts an unanswered question as asked and missed', () => {
    expect(
      weightedScore([
        { points: 1, score: 1 },
        { points: 1, score: null },
      ])
    ).toBe(0.5);
  });

  it('treats missing or zero points as one', () => {
    expect(weightedScore([{ score: 1 }, { points: 0, score: 0 }])).toBe(0.5);
  });

  it('has nothing to say about no questions', () => {
    expect(weightedScore([])).toBeNull();
  });
});

describe('verdictOf', () => {
  it("is the app's verdict until she gives hers", () => {
    expect(
      verdictOf({ correct: false, score: 0, teacher_score: null })
    ).toEqual({ correct: false, score: 0, hers: false });
  });

  it('is hers once she has ticked it', () => {
    expect(verdictOf({ correct: false, score: 0, teacher_score: 1 })).toEqual({
      correct: true,
      score: 1,
      hers: true,
    });
    expect(verdictOf({ correct: true, score: 1, teacher_score: 0 })).toEqual({
      correct: false,
      score: 0,
      hers: true,
    });
  });

  it('fills a missing score from the tick', () => {
    expect(
      verdictOf({ correct: true, score: null, teacher_score: null })
    ).toEqual({ correct: true, score: 1, hers: false });
  });

  it('is nothing for no answer', () => {
    expect(verdictOf(null)).toBeNull();
  });
});
