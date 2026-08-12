import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import {
  countdownTo,
  daysBetween,
  daysTogether,
  daysTogetherNow,
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

describe('daysTogetherNow', () => {
  const at = (iso: string) => DateTime.fromISO(iso, { setZone: true });

  it('is 0 on the very first hour, not negative', () => {
    expect(daysTogetherNow(at('2025-06-15T03:30:00+07:00'))).toBe(0);
    expect(daysTogetherNow(at('2025-06-15T02:00:00+07:00'))).toBe(0);
  });

  it('rolls over at 3am Novosibirsk, not at midnight', () => {
    expect(daysTogetherNow(at('2025-06-16T02:59:00+07:00'))).toBe(0);
    expect(daysTogetherNow(at('2025-06-16T03:01:00+07:00'))).toBe(1);
  });

  it('gives the same answer from Curicó as from Novosibirsk', () => {
    // The same instant, written in each of our zones.
    const novo = at('2026-08-12T12:00:00+07:00');
    const curico = at('2026-08-12T01:00:00-04:00');
    expect(+novo).toBe(+curico);
    expect(daysTogetherNow(novo)).toBe(daysTogetherNow(curico));
  });

  it('counts a plain year correctly', () => {
    expect(daysTogetherNow(at('2026-06-15T12:00:00+07:00'))).toBe(365);
  });

  it('needs no arguments and no database', () => {
    expect(daysTogetherNow()).toBeGreaterThan(400);
  });
});
