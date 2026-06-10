import { describe, expect, it } from 'vitest';
import {
  buildLoveMap,
  computeStreaks,
  scoreDay,
  type DayRecord,
} from './love-map';

function rec(p: Partial<DayRecord> & { coupleDay: string }): DayRecord {
  return {
    category: 'general',
    bothSubmitted: true,
    selfOwn: null,
    selfGuess: null,
    partnerOwn: null,
    partnerGuess: null,
    ...p,
  };
}

describe('scoreDay', () => {
  it('scores a point when guess matches partner truth, both ways', () => {
    const d = rec({
      coupleDay: '2026-06-07',
      selfOwn: 'a',
      selfGuess: 'b',
      partnerOwn: 'b',
      partnerGuess: 'a',
    });
    expect(scoreDay(d)).toEqual({ selfRight: true, partnerRight: true });
  });
  it('scores nothing before both submit', () => {
    const d = rec({
      coupleDay: '2026-06-07',
      bothSubmitted: false,
      selfGuess: 'a',
      partnerOwn: 'a',
    });
    expect(scoreDay(d)).toEqual({ selfRight: false, partnerRight: false });
  });
  it('is asymmetric when only one direction is right', () => {
    const d = rec({
      coupleDay: '2026-06-07',
      selfOwn: 'a',
      selfGuess: 'a',
      partnerOwn: 'c',
      partnerGuess: 'a',
    });
    // selfGuess 'a' vs partnerOwn 'c' → wrong; partnerGuess 'a' vs selfOwn 'a' → right
    expect(scoreDay(d)).toEqual({ selfRight: false, partnerRight: true });
  });
});

describe('buildLoveMap', () => {
  it('empty / no-both records → zeros, no div by zero', () => {
    const lm = buildLoveMap([
      rec({ coupleDay: '2026-06-07', bothSubmitted: false }),
    ]);
    expect(lm.selfKnowsPartner.pct).toBe(0);
    expect(lm.daysPlayed).toBe(0);
    expect(lm.currentStreak).toBe(0);
  });
  it('a perfect knower → 100%', () => {
    const days = ['2026-06-07', '2026-06-08'].map((coupleDay) =>
      rec({
        coupleDay,
        selfOwn: 'a',
        selfGuess: 'b',
        partnerOwn: 'b',
        partnerGuess: 'a',
      })
    );
    const lm = buildLoveMap(days);
    expect(lm.selfKnowsPartner.pct).toBe(100);
    expect(lm.partnerKnowsSelf.pct).toBe(100);
    expect(lm.daysPlayed).toBe(2);
  });
  it('counts category coverage', () => {
    const lm = buildLoveMap([
      rec({ coupleDay: '2026-06-07', category: 'food' }),
      rec({ coupleDay: '2026-06-08', category: 'food' }),
      rec({ coupleDay: '2026-06-09', category: 'love' }),
    ]);
    expect(lm.categoryCoverage).toEqual({ food: 2, love: 1 });
  });
});

describe('computeStreaks', () => {
  it('contiguous both-days → current = longest = N', () => {
    const days = ['2026-06-07', '2026-06-08', '2026-06-09'].map((coupleDay) =>
      rec({ coupleDay })
    );
    expect(computeStreaks(days)).toEqual({ current: 3, longest: 3 });
  });
  it('[both, one-sided, both] → current = 1, longest = 1', () => {
    const r = [
      rec({ coupleDay: '2026-06-07' }),
      rec({ coupleDay: '2026-06-08', bothSubmitted: false }),
      rec({ coupleDay: '2026-06-09' }),
    ];
    expect(computeStreaks(r)).toEqual({ current: 1, longest: 1 });
  });
  it('trailing incomplete day → current 0 though a past run exists', () => {
    const r = [
      rec({ coupleDay: '2026-06-07' }),
      rec({ coupleDay: '2026-06-08' }),
      rec({ coupleDay: '2026-06-09', bothSubmitted: false }),
    ];
    expect(computeStreaks(r)).toEqual({ current: 0, longest: 2 });
  });
});
