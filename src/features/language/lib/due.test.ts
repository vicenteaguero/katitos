import { describe, expect, it } from 'vitest';
import { daysUntil, dueLabel } from './due';

const at = (iso: string) => new Date(iso);

describe('daysUntil', () => {
  it('is today all day long, not only until noon', () => {
    expect(daysUntil('2026-08-30', at('2026-08-30T00:01:00'))).toBe(0);
    expect(daysUntil('2026-08-30', at('2026-08-30T12:01:00'))).toBe(0);
    expect(daysUntil('2026-08-30', at('2026-08-30T23:59:00'))).toBe(0);
  });

  it('counts calendar days, whatever the hour', () => {
    expect(daysUntil('2026-08-31', at('2026-08-30T23:50:00'))).toBe(1);
    expect(daysUntil('2026-09-02', at('2026-08-30T09:00:00'))).toBe(3);
    expect(daysUntil('2026-08-29', at('2026-08-30T00:10:00'))).toBe(-1);
  });
});

describe('dueLabel', () => {
  it('says it the way a person would', () => {
    const now = at('2026-08-30T15:00:00');
    expect(dueLabel('2026-08-30', now)).toBe('today');
    expect(dueLabel('2026-08-31', now)).toBe('tomorrow');
    expect(dueLabel('2026-09-04', now)).toBe('in 5 days');
    expect(dueLabel('2026-08-29', now)).toBe('1 day late');
    expect(dueLabel('2026-08-27', now)).toBe('3 days late');
  });
});
