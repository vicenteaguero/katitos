import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import {
  canMark,
  closesAt,
  dayName,
  liveDays,
  localDay,
  recentDays,
} from './five-days';

// Hers. Every assertion below is about her wall clock, because the window is.
const NSK = 'Asia/Novosibirsk';

/** 02:00 Tuesday in Novosibirsk - inside the grace window for her Monday. */
const GRACE = DateTime.fromISO('2026-09-07T19:00:00Z');
/** 04:00 Tuesday there - an hour past it. */
const AFTER = DateTime.fromISO('2026-09-07T21:00:00Z');

describe('her window', () => {
  it('is open on today', () => {
    expect(canMark('2026-09-08', NSK, false, GRACE)).toBe(true);
  });

  it('still has yesterday at 2AM', () => {
    expect(localDay(NSK, GRACE)).toBe('2026-09-08');
    expect(canMark('2026-09-07', NSK, false, GRACE)).toBe(true);
  });

  it('has lost yesterday by 4AM', () => {
    expect(canMark('2026-09-07', NSK, false, AFTER)).toBe(false);
  });

  it('never reaches the day before yesterday', () => {
    expect(canMark('2026-09-06', NSK, false, GRACE)).toBe(false);
  });

  it('cannot reach a day she has not lived yet', () => {
    expect(canMark('2026-09-09', NSK, false, GRACE)).toBe(false);
    // Not even for him: nobody ticks a day that has not happened.
    expect(canMark('2026-09-09', NSK, true, GRACE)).toBe(false);
  });
});

describe('his window', () => {
  it('is every day that has happened', () => {
    expect(canMark('2026-09-07', NSK, true, AFTER)).toBe(true);
    expect(canMark('2026-08-01', NSK, true, AFTER)).toBe(true);
    expect(canMark('2025-01-01', NSK, true, AFTER)).toBe(true);
  });
});

describe('the 3AM edge', () => {
  it('closes Monday at 3AM Tuesday on her clock', () => {
    const shuts = closesAt('2026-09-07', NSK);
    expect(shuts.setZone(NSK).toFormat('yyyy-MM-dd HH:mm')).toBe(
      '2026-09-08 03:00'
    );
  });

  it('survives the Chilean midnight that does not exist', () => {
    // 6 September 2026: Curicó goes 23:59:59 straight to 01:00, so the start of
    // the day itself is 01:00 and 3AM after it is a real hour either way.
    const shuts = closesAt('2026-09-05', 'America/Santiago');
    expect(shuts.isValid).toBe(true);
    expect(shuts.setZone('America/Santiago').toFormat('HH:mm')).toBe('03:00');
  });

  it('falls back to UTC on an unknown zone rather than the host zone', () => {
    expect(localDay(null, GRACE)).toBe('2026-09-07');
    expect(closesAt('2026-09-07', undefined).toUTC().toFormat('HH:mm')).toBe(
      '03:00'
    );
  });
});

describe('what the screen shows', () => {
  it('offers today and yesterday inside the grace window', () => {
    expect(liveDays(NSK, GRACE)).toEqual(['2026-09-08', '2026-09-07']);
  });

  it('offers today alone once the window has shut', () => {
    expect(liveDays(NSK, AFTER)).toEqual(['2026-09-08']);
  });

  it('counts the strip back from today, newest first', () => {
    expect(recentDays(NSK, 3, AFTER)).toEqual([
      '2026-09-08',
      '2026-09-07',
      '2026-09-06',
    ]);
  });

  it('names the days a person would name', () => {
    expect(dayName('2026-09-08', NSK, AFTER)).toBe('Today');
    expect(dayName('2026-09-07', NSK, AFTER)).toBe('Yesterday');
    expect(dayName('2026-09-01', NSK, AFTER)).toBe('Tuesday 1 Sep');
  });
});
