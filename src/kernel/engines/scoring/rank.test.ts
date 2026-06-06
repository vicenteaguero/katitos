import { describe, expect, it } from 'vitest';
import { aggregateLeaderboard } from './rank';

const s = (user_id: string, score: number, created_at: string) => ({
  user_id,
  score,
  created_at,
});

describe('aggregateLeaderboard', () => {
  it('desc: best is the max, ranked high → low', () => {
    const r = aggregateLeaderboard(
      [s('a', 10, '1'), s('a', 30, '2'), s('b', 20, '1')],
      'desc'
    );
    expect(r.map((e) => e.userId)).toEqual(['a', 'b']);
    expect(r[0].best).toBe(30);
    expect(r[0].plays).toBe(2);
  });

  it('asc: best is the min, ranked low → high', () => {
    const r = aggregateLeaderboard(
      [s('a', 300, '1'), s('a', 120, '2'), s('b', 90, '1')],
      'asc'
    );
    expect(r.map((e) => e.userId)).toEqual(['b', 'a']);
    expect(r[0].best).toBe(90);
    expect(r.find((e) => e.userId === 'a')?.best).toBe(120);
  });

  it('handles an empty list', () => {
    expect(aggregateLeaderboard([], 'desc')).toEqual([]);
  });
});
