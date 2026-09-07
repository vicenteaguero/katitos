import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import {
  addDays,
  isDayOpen,
  isSettled,
  monthGrid,
  weekDays,
  weekStart,
} from './days';

const SCL = 'America/Santiago';
const NSK = 'Asia/Novosibirsk';
// 17:00 Monday in Curicó, 03:00 Tuesday in Novosibirsk. The eleven hours, live.
const NOW = DateTime.fromISO('2026-09-07T20:00:00Z');

describe('the window', () => {
  it('lets her fix her Monday while it is already Tuesday where she is', () => {
    expect(isDayOpen('2026-09-07', NSK, SCL, NOW)).toBe(true);
  });

  it('lets him tick today', () => {
    expect(isDayOpen('2026-09-07', SCL, NSK, NOW)).toBe(true);
  });

  it('closes a day once the day after it has ended on the later clock', () => {
    expect(isDayOpen('2026-09-06', SCL, NSK, NOW)).toBe(false);
    expect(isDayOpen('2026-09-06', NSK, SCL, NOW)).toBe(false);
  });

  it('never opens the future, even when your love is already in it', () => {
    expect(isDayOpen('2026-09-08', SCL, NSK, NOW)).toBe(false);
    expect(isDayOpen('2026-09-08', NSK, SCL, NOW)).toBe(true);
  });

  it('agrees from both sides of the world', () => {
    for (const day of [
      '2026-09-05',
      '2026-09-06',
      '2026-09-07',
      '2026-09-08',
    ]) {
      expect(isSettled(day, SCL, NSK, NOW)).toBe(isSettled(day, NSK, SCL, NOW));
    }
  });

  it('settles only what neither of us can touch again', () => {
    expect(isSettled('2026-09-06', SCL, NSK, NOW)).toBe(true);
    expect(isSettled('2026-09-07', SCL, NSK, NOW)).toBe(false);
  });

  it('falls back to UTC rather than the host zone', () => {
    expect(isDayOpen('2026-09-07', null, null, NOW)).toBe(true);
  });
});

describe('the calendar', () => {
  it('counts days on the label, not on a clock', () => {
    expect(addDays('2026-09-06', 1)).toBe('2026-09-07');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('starts a week on Monday', () => {
    expect(weekStart('2026-09-07')).toBe('2026-09-07');
    expect(weekStart('2026-09-06')).toBe('2026-08-31');
    expect(weekDays('2026-09-09')).toHaveLength(7);
    expect(weekDays('2026-09-09')[0]).toBe('2026-09-07');
  });

  it('draws whole weeks, so a run never breaks across a row', () => {
    const grid = monthGrid('2026-09');
    expect(grid.length % 7).toBe(0);
    expect(grid[0]).toBe('2026-08-31');
    expect(grid).toContain('2026-09-01');
    expect(grid).toContain('2026-09-30');
  });
});
