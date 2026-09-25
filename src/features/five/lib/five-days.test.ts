import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import { canMark, dayName, isClosed, liveDays, recentDays } from './five-days';

// Hers and his. The window is about the eleven hours between them.
const NSK = 'Asia/Novosibirsk';
const SCL = 'America/Santiago';

/** 02:00 Tuesday in Novosibirsk, 16:00 Monday in Curicó. */
const HER_NIGHT = DateTime.fromISO('2026-09-07T19:00:00Z');
/** 10:00 Wednesday in Novosibirsk, so Monday is gone for both of them. */
const LATER = DateTime.fromISO('2026-09-09T03:00:00Z');

describe('her window', () => {
  it('is open on her today', () => {
    expect(canMark('2026-09-08', NSK, SCL, false, HER_NIGHT)).toBe(true);
  });

  it('still has yesterday while it is yesterday for him', () => {
    // The whole point of the wider rule: a thing she did and forgot to tick.
    expect(canMark('2026-09-07', NSK, SCL, false, HER_NIGHT)).toBe(true);
  });

  it('closes a day once the day after it has ended on the clock behind', () => {
    expect(canMark('2026-09-06', NSK, SCL, false, LATER)).toBe(false);
  });

  it('cannot reach a day she has not lived yet', () => {
    expect(canMark('2026-09-09', NSK, SCL, false, HER_NIGHT)).toBe(false);
    // Not even for him: nobody ticks a day that has not happened.
    expect(canMark('2026-09-09', NSK, SCL, true, HER_NIGHT)).toBe(false);
  });
});

describe('his window', () => {
  it('is every day that has happened', () => {
    expect(canMark('2026-09-06', NSK, SCL, true, LATER)).toBe(true);
    expect(canMark('2025-01-01', NSK, SCL, true, LATER)).toBe(true);
  });
});

describe('when the money may be settled', () => {
  it('waits while the day is still open to either of them', () => {
    expect(isClosed('2026-09-07', NSK, SCL, HER_NIGHT)).toBe(false);
  });

  it('is ready once the day is final for both', () => {
    expect(isClosed('2026-09-06', NSK, SCL, LATER)).toBe(true);
  });
});

describe('what the screen shows', () => {
  it('offers today and yesterday while yesterday is still open', () => {
    expect(liveDays(NSK, SCL, HER_NIGHT)).toEqual(['2026-09-08', '2026-09-07']);
  });

  it('counts the strip back from today, newest first', () => {
    expect(recentDays(NSK, 3, LATER)).toEqual([
      '2026-09-09',
      '2026-09-08',
      '2026-09-07',
    ]);
  });

  it('names the days a person would name', () => {
    expect(dayName('2026-09-09', NSK, LATER)).toBe('Today');
    expect(dayName('2026-09-08', NSK, LATER)).toBe('Yesterday');
    expect(dayName('2026-09-01', NSK, LATER)).toBe('Tuesday 1 Sep');
  });
});
