import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import { coupleDay, isNextDay } from './couple-day';

const SANTIAGO = 'America/Santiago'; // UTC-3 / -4
const MOSCOW = 'Europe/Moscow'; // UTC+3

describe('coupleDay', () => {
  it('returns the EARLIER civil date at a day boundary', () => {
    // 02:00 UTC: Santiago is 23:00 the previous day, Moscow is 05:00 the new day.
    const now = DateTime.fromISO('2026-06-07T02:00:00', { zone: 'utc' });
    // Santiago local date = 2026-06-06, Moscow = 2026-06-07 → MIN = 06-06.
    expect(coupleDay(SANTIAGO, MOSCOW, now)).toBe('2026-06-06');
  });

  it('is symmetric — argument order does not matter', () => {
    const now = DateTime.fromISO('2026-06-07T02:00:00', { zone: 'utc' });
    expect(coupleDay(SANTIAGO, MOSCOW, now)).toBe(
      coupleDay(MOSCOW, SANTIAGO, now)
    );
  });

  it('agrees when both zones are on the same date', () => {
    const now = DateTime.fromISO('2026-06-07T15:00:00', { zone: 'utc' });
    expect(coupleDay(SANTIAGO, MOSCOW, now)).toBe('2026-06-07');
  });

  it('handles a DST shift correctly (Chile changes in April)', () => {
    // Around Chile's autumn DST change; just assert it produces a valid MIN.
    const now = DateTime.fromISO('2026-04-05T03:30:00', { zone: 'utc' });
    const a = now.setZone(SANTIAGO).toISODate()!;
    const b = now.setZone(MOSCOW).toISODate()!;
    expect(coupleDay(SANTIAGO, MOSCOW, now)).toBe(a < b ? a : b);
  });

  it('handles a leap day', () => {
    const now = DateTime.fromISO('2028-02-29T12:00:00', { zone: 'utc' });
    expect(coupleDay(SANTIAGO, MOSCOW, now)).toBe('2028-02-29');
  });

  it('falls back to UTC for a null zone (never the host zone)', () => {
    const now = DateTime.fromISO('2026-06-07T23:30:00', { zone: 'utc' });
    // self=null → UTC (2026-06-07), partner=Moscow (already 2026-06-08) → MIN = 06-07.
    expect(coupleDay(null, MOSCOW, now)).toBe('2026-06-07');
  });
});

describe('isNextDay', () => {
  it('detects consecutive days across a month boundary', () => {
    expect(isNextDay('2026-01-31', '2026-02-01')).toBe(true);
  });
  it('detects consecutive days across a leap boundary', () => {
    expect(isNextDay('2028-02-29', '2028-03-01')).toBe(true);
  });
  it('is false for same day or a gap', () => {
    expect(isNextDay('2026-06-07', '2026-06-07')).toBe(false);
    expect(isNextDay('2026-06-07', '2026-06-09')).toBe(false);
  });
});
