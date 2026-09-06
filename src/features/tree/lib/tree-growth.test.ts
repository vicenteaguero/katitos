import { describe, expect, it } from 'vitest';
import {
  canWater,
  deriveTree,
  growthForWater,
  health,
  heightMeters,
  MS_PER_DAY,
  stageFromPoints,
  type Watering,
} from './tree-growth';

const A = 'user-a';
const B = 'user-b';
const MEMBERS: [string, string] = [A, B];
const T0 = Date.parse('2024-08-15T00:00:00Z');

describe('health (Gentle decay)', () => {
  it('is full when never watered', () => {
    expect(health(null, T0)).toBe(1);
  });
  it('halves each day, floored at 0.05', () => {
    expect(health(T0, T0 + 1 * MS_PER_DAY)).toBeCloseTo(0.5, 6);
    expect(health(T0, T0 + 2 * MS_PER_DAY)).toBeCloseTo(0.25, 6);
    expect(health(T0, T0 + 3 * MS_PER_DAY)).toBeCloseTo(0.125, 6);
    expect(health(T0, T0 + 30 * MS_PER_DAY)).toBe(0.05); // deep wilt, floored
  });
  it('snaps back to full the instant you water (revival)', () => {
    const now = T0 + 30 * MS_PER_DAY;
    expect(health(now, now)).toBe(1);
  });
});

describe('growthForWater', () => {
  it('ranges 0.62..1.0 with health', () => {
    expect(growthForWater(1)).toBeCloseTo(1.0, 6);
    expect(growthForWater(0.5)).toBeCloseTo(0.8, 6);
    expect(growthForWater(0.05)).toBeCloseTo(0.62, 6);
  });
});

describe('canWater (alternating rule)', () => {
  it('allows the first water', () => {
    expect(canWater(null, A).ok).toBe(true);
  });
  it('blocks the same person twice', () => {
    expect(canWater(A, A)).toEqual({
      ok: false,
      reason: 'waiting-for-partner',
    });
  });
  it('allows the partner', () => {
    expect(canWater(A, B).ok).toBe(true);
  });
});

/** Build a log of `days` consecutive couple-days at `perDay` alternating waters. */
function simulate(days: number, perDay: number): Watering[] {
  const log: Watering[] = [];
  let who = 0;
  for (let d = 0; d < days; d++) {
    const day = new Date(T0 + d * MS_PER_DAY).toISOString().slice(0, 10);
    for (let k = 0; k < perDay; k++) {
      // spread waters evenly across the day so health partially decays between
      const at = T0 + d * MS_PER_DAY + (k * MS_PER_DAY) / perDay;
      log.push({
        watered_by: who % 2 ? B : A,
        watered_at: at,
        couple_day: day,
      });
      who++;
    }
  }
  return log;
}

describe('deriveTree - 5-year cadences land in sensible ranges', () => {
  const FIVE_Y = 1825;
  const now = T0 + FIVE_Y * MS_PER_DAY;

  it('light care (1 alternating water/day) → stage ~88-94, never >100', () => {
    const t = deriveTree(simulate(FIVE_Y, 1), T0, now, MEMBERS);
    expect(t.stage).toBeGreaterThanOrEqual(85);
    expect(t.stage).toBeLessThanOrEqual(96);
    expect(t.stage).toBeLessThan(100);
  });

  it('devoted care (2 waters/day) → stage ~96-100', () => {
    const t = deriveTree(simulate(FIVE_Y, 2), T0, now, MEMBERS);
    expect(t.stage).toBeGreaterThanOrEqual(95);
    expect(t.stage).toBeLessThanOrEqual(100);
  });

  it('height keeps climbing across the arc (year 1 < year 5 < 12m)', () => {
    const y1 = deriveTree(simulate(365, 1), T0, T0 + 365 * MS_PER_DAY, MEMBERS);
    const y5 = deriveTree(simulate(FIVE_Y, 1), T0, now, MEMBERS);
    expect(y1.height).toBeGreaterThan(4);
    expect(y5.height).toBeGreaterThan(y1.height);
    expect(y5.height).toBeLessThan(12);
  });
});

describe('deriveTree - structure is monotonic, streaks correct', () => {
  it('growth_points never decrease across the log prefix', () => {
    const log = simulate(60, 1);
    let prev = -1;
    for (let n = 0; n <= log.length; n++) {
      const t = deriveTree(log.slice(0, n), T0, T0 + 60 * MS_PER_DAY, MEMBERS);
      expect(t.growthPoints).toBeGreaterThanOrEqual(prev);
      prev = t.growthPoints;
    }
  });

  it('streak: consecutive days increment, a gap resets, same-day no double', () => {
    const d = (n: number) =>
      new Date(T0 + n * MS_PER_DAY).toISOString().slice(0, 10);
    const log: Watering[] = [
      { watered_by: A, watered_at: T0, couple_day: d(0) },
      { watered_by: B, watered_at: T0 + MS_PER_DAY, couple_day: d(1) },
      { watered_by: A, watered_at: T0 + MS_PER_DAY + 1, couple_day: d(1) }, // same day
      { watered_by: B, watered_at: T0 + 5 * MS_PER_DAY, couple_day: d(5) }, // gap
    ];
    const t = deriveTree(log, T0, T0 + 5 * MS_PER_DAY, MEMBERS);
    expect(t.longestStreak).toBe(2); // days 0,1
    expect(t.currentStreak).toBe(1); // reset at the gap
    expect(t.nextWaterer).toBe(A); // last was B
  });
});

describe('stage/height edge', () => {
  it('stage 0 at 0 points, capped at 100', () => {
    expect(stageFromPoints(0)).toBe(0);
    expect(stageFromPoints(1e9)).toBeLessThanOrEqual(100);
  });
  it('height 0 at 0 points', () => {
    expect(heightMeters(0)).toBe(0);
  });
});
