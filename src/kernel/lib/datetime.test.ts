import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import {
  countdownTo,
  daysBetween,
  daysTogether,
  nextMonthsversary,
} from './datetime';

describe('datetime', () => {
  it('counts whole days between dates', () => {
    expect(daysBetween('2026-01-01', '2026-01-08')).toBe(7);
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0);
  });

  it('daysTogether is never negative and 0 for nullish', () => {
    expect(daysTogether(null)).toBe(0);
    expect(daysTogether(undefined)).toBe(0);
  });

  it('breaks a future target into positive parts', () => {
    const now = DateTime.fromISO('2026-01-01T00:00:00');
    const parts = countdownTo('2026-01-03T06:00:00', now);
    expect(parts.isPast).toBe(false);
    expect(parts.days).toBe(2);
    expect(parts.hours).toBe(6);
  });

  it('flags past targets', () => {
    const now = DateTime.fromISO('2026-01-10T00:00:00');
    expect(countdownTo('2026-01-01T00:00:00', now).isPast).toBe(true);
  });

  it('finds the upcoming monthsversary day-of-month', () => {
    const now = DateTime.fromISO('2026-01-20T12:00:00');
    const next = nextMonthsversary(15, now);
    expect(next.day).toBe(15);
    expect(next.month).toBe(2); // already past Jan 15 → Feb 15
  });

  it('includes today when it is the day', () => {
    const now = DateTime.fromISO('2026-03-15T08:00:00');
    expect(nextMonthsversary(15, now).month).toBe(3);
  });
});
