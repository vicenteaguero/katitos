import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import { agoLabel, daysUntil, dueLabel } from './due';

describe('daysUntil', () => {
  it('counts calendar days between two dates', () => {
    expect(daysUntil('2026-08-30', '2026-08-30')).toBe(0);
    expect(daysUntil('2026-08-31', '2026-08-30')).toBe(1);
    expect(daysUntil('2026-09-02', '2026-08-30')).toBe(3);
    expect(daysUntil('2026-08-29', '2026-08-30')).toBe(-1);
  });

  it('is a whole number across a month end', () => {
    expect(daysUntil('2026-09-01', '2026-08-30')).toBe(2);
  });
});

describe('dueLabel', () => {
  it('says it the way a person would', () => {
    expect(dueLabel('2026-08-30', '2026-08-30')).toBe('today');
    expect(dueLabel('2026-08-31', '2026-08-30')).toBe('tomorrow');
    expect(dueLabel('2026-09-04', '2026-08-30')).toBe('in 5 days');
    expect(dueLabel('2026-08-29', '2026-08-30')).toBe('1 day late');
    expect(dueLabel('2026-08-27', '2026-08-30')).toBe('3 days late');
  });
});

describe('agoLabel', () => {
  const now = DateTime.fromISO('2026-08-30T12:00:00Z');

  it('is relative within the day', () => {
    expect(agoLabel('2026-08-30T11:59:40Z', now)).toBe('just now');
    expect(agoLabel('2026-08-30T11:20:00Z', now)).toBe('40 min ago');
    expect(agoLabel('2026-08-30T11:00:00Z', now)).toBe('1 hr ago');
    expect(agoLabel('2026-08-30T09:00:00Z', now)).toBe('3 hrs ago');
  });

  it('is a clock after that', () => {
    expect(agoLabel('2026-08-27T09:00:00Z', now)).toMatch(/^\w{3} \d\d:\d\d$/);
  });

  it('gives up on garbage', () => {
    expect(agoLabel('nonsense', now)).toBe('');
  });
});
