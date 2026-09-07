import { describe, expect, it } from 'vitest';
import { endOfDay, localDay, nextDay, startOfDay } from './zone.ts';

const CURICO = 'America/Santiago';
const NOVOSIBIRSK = 'Asia/Novosibirsk';

/** 2026-08-11 20:00 UTC → 16:00 the 11th in Curicó, 03:00 the 12th in Novosibirsk. */
const SPLIT = new Date('2026-08-11T20:00:00Z');

const iso = (d: Date) => d.toISOString();

describe('localDay', () => {
  it('gives each zone its own civil date across the split', () => {
    expect(localDay(CURICO, SPLIT)).toBe('2026-08-11');
    expect(localDay(NOVOSIBIRSK, SPLIT)).toBe('2026-08-12');
  });

  it('reads midnight as the new day, not hour 24 of the old one', () => {
    // 04:00 UTC is exactly 00:00 in Curicó in August.
    expect(localDay(CURICO, new Date('2026-08-12T04:00:00Z'))).toBe(
      '2026-08-12'
    );
    expect(localDay(CURICO, new Date('2026-08-12T03:59:59Z'))).toBe(
      '2026-08-11'
    );
  });
});

describe('nextDay', () => {
  it('rolls over months and years', () => {
    expect(nextDay('2026-08-11')).toBe('2026-08-12');
    expect(nextDay('2026-08-31')).toBe('2026-09-01');
    expect(nextDay('2026-12-31')).toBe('2027-01-01');
  });
});

describe('startOfDay', () => {
  it('finds the first instant of an ordinary day', () => {
    expect(iso(startOfDay(CURICO, '2026-08-12'))).toBe(
      '2026-08-12T04:00:00.000Z'
    );
    expect(iso(startOfDay(NOVOSIBIRSK, '2026-08-12'))).toBe(
      '2026-08-11T17:00:00.000Z'
    );
  });

  it('survives the night Chile has no midnight', () => {
    // 6 September 2026: the clocks go 23:59:59 → 01:00. The first instant of
    // the 6th is 01:00 local. Offset arithmetic answers 03:00Z here, which is
    // 23:00 on the 5th - an hour early, on the one night it matters.
    expect(iso(startOfDay(CURICO, '2026-09-06'))).toBe(
      '2026-09-06T04:00:00.000Z'
    );
    expect(localDay(CURICO, startOfDay(CURICO, '2026-09-06'))).toBe(
      '2026-09-06'
    );
    // …and the instant before it still belongs to the 5th.
    expect(
      localDay(CURICO, new Date(startOfDay(CURICO, '2026-09-06').getTime() - 1))
    ).toBe('2026-09-05');
  });

  it('survives the night Chile has two 23:00s', () => {
    // 4 April 2026: the clocks fall back, so that date is 25 hours long.
    expect(iso(startOfDay(CURICO, '2026-04-04'))).toBe(
      '2026-04-04T03:00:00.000Z'
    );
    const span =
      startOfDay(CURICO, '2026-04-05').getTime() -
      startOfDay(CURICO, '2026-04-04').getTime();
    expect(span / 3_600_000).toBe(25);
  });

  it('measures the 23-hour day too', () => {
    const span =
      startOfDay(CURICO, '2026-09-07').getTime() -
      startOfDay(CURICO, '2026-09-06').getTime();
    expect(span / 3_600_000).toBe(23);
  });

  it('is exact to the millisecond on both sides of the boundary', () => {
    const start = startOfDay(NOVOSIBIRSK, '2026-08-12');
    expect(localDay(NOVOSIBIRSK, start)).toBe('2026-08-12');
    expect(localDay(NOVOSIBIRSK, new Date(start.getTime() - 1))).toBe(
      '2026-08-11'
    );
  });
});

describe('endOfDay', () => {
  it('is the moment that date stops being on the clock', () => {
    expect(iso(endOfDay(CURICO, '2026-08-11'))).toBe(
      '2026-08-12T04:00:00.000Z'
    );
    expect(iso(endOfDay(NOVOSIBIRSK, '2026-08-11'))).toBe(
      '2026-08-11T17:00:00.000Z'
    );
  });

  it('measures the borrowed hours she actually gets', () => {
    // Her 11th ends at 17:00 UTC; his ends at 04:00 UTC the next day. Eleven
    // hours of the 11th exist for her only because Curicó is still on it.
    const hers = endOfDay(NOVOSIBIRSK, '2026-08-11').getTime();
    const his = endOfDay(CURICO, '2026-08-11').getTime();
    expect((his - hers) / 3_600_000).toBe(11);
  });

  it('shortens the borrowed window when Chile springs forward', () => {
    // The 5th of September ends in Curicó at 04:00Z on the 6th as usual, but
    // the 6th ends an hour earlier than an ordinary day would.
    expect(iso(endOfDay(CURICO, '2026-09-06'))).toBe(
      '2026-09-07T03:00:00.000Z'
    );
  });
});
