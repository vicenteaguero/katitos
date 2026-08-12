import { describe, expect, it } from 'vitest';
import { DateTime } from '@kernel/lib';
import type { Flower } from '../types';
import {
  currentMonthUtc,
  groupByYear,
  lastYear,
  monthKey,
  monthLabel,
} from './months';

const AUG_2026 = DateTime.fromISO('2026-08-11T12:00:00Z', { zone: 'utc' });
const DEC_2026 = DateTime.fromISO('2026-12-03T12:00:00Z', { zone: 'utc' });
const DEC_2027 = DateTime.fromISO('2027-12-03T12:00:00Z', { zone: 'utc' });

function flower(occasion_date: string): Flower {
  return {
    id: occasion_date,
    occasion_date,
    image_path: `${occasion_date}.jpg`,
    note: null,
    given_by: null,
    uploaded_by: null,
    created_at: '2026-01-01T00:00:00Z',
  } as Flower;
}

describe('monthKey / monthLabel', () => {
  it('pins any day to the first of its month', () => {
    expect(monthKey('2026-04-17')).toBe('2026-04-01');
  });

  it('reads the way it is printed on the photo', () => {
    expect(monthLabel('2026-04-01')).toBe('Apr 2026');
    expect(monthLabel('2025-07-01')).toBe('Jul 2025');
  });
});

describe('lastYear', () => {
  it('keeps the current year open all year', () => {
    expect(lastYear(AUG_2026)).toBe(2026);
  });

  it('opens the next year as soon as December arrives', () => {
    expect(lastYear(DEC_2026)).toBe(2027);
  });

  it('keeps doing that every December, on its own', () => {
    expect(lastYear(DEC_2027)).toBe(2028);
  });
});

describe('groupByYear — reading', () => {
  const flowers = [
    flower('2026-04-01'),
    flower('2026-07-01'),
    flower('2025-12-01'),
  ];

  it('shows only the filled months', () => {
    const years = groupByYear(flowers, { editing: false, now: AUG_2026 });
    expect(years.map((y) => y.year)).toEqual([2026, 2025]);
    expect(years[0].slots.map((s) => s.label)).toEqual([
      'Jul 2026',
      'Apr 2026',
    ]);
  });

  it('shows nothing at all when none have been added', () => {
    expect(groupByYear([], { editing: false, now: AUG_2026 })).toEqual([]);
  });

  it('tolerates a bouquet stored on a mid-month day', () => {
    const years = groupByYear([flower('2026-04-17')], {
      editing: false,
      now: AUG_2026,
    });
    expect(years[0].slots[0].label).toBe('Apr 2026');
  });
});

describe('groupByYear — editing', () => {
  it('starts at June 2025 and never earlier', () => {
    const years = groupByYear([], { editing: true, now: AUG_2026 });
    const first = years[years.length - 1];
    expect(first.year).toBe(2025);
    // Bottom of the last section, bottom of the page.
    expect(first.slots[first.slots.length - 1].label).toBe('Jun 2025');
    expect(first.slots).toHaveLength(7); // Jun..Dec
  });

  it('opens the whole current year, not just the months already past', () => {
    const years = groupByYear([], { editing: true, now: AUG_2026 });
    const y2026 = years.find((y) => y.year === 2026)!;
    expect(y2026.slots).toHaveLength(12);
    expect(y2026.slots[0].label).toBe('Dec 2026');
  });

  it('stops at the current year until December', () => {
    const years = groupByYear([], { editing: true, now: AUG_2026 });
    expect(years.map((y) => y.year)).toEqual([2026, 2025]);
  });

  it('adds next year the moment December arrives', () => {
    const years = groupByYear([], { editing: true, now: DEC_2026 });
    expect(years.map((y) => y.year)).toEqual([2027, 2026, 2025]);
    expect(years[0].slots).toHaveLength(12);
  });

  it('keeps unlocking, year after year, with no code change', () => {
    const years = groupByYear([], { editing: true, now: DEC_2027 });
    expect(years[0].year).toBe(2028);
    expect(years.map((y) => y.year)).toContain(2025);
  });

  it('counts how many of a year are filled', () => {
    const years = groupByYear([flower('2026-04-01'), flower('2026-07-01')], {
      editing: true,
      now: AUG_2026,
    });
    const y = years.find((y) => y.year === 2026)!;
    expect(y.filled).toBe(2);
    expect(y.total).toBe(12);
  });

  it('newest year first — this year is what you look at', () => {
    const years = groupByYear([], { editing: true, now: AUG_2026 });
    expect(years[0].year).toBeGreaterThan(years[1].year);
  });
});

describe('groupByYear — a photo is never hidden', () => {
  // The bug this covers: the June-2025 floor was applied as a DISPLAY filter,
  // so a bouquet stored before it existed in the database and simply never
  // rendered — and if it was the only one that year, the whole year vanished.
  it('shows a bouquet from before June 2025', () => {
    const years = groupByYear([flower('2025-03-01')], {
      editing: false,
      now: AUG_2026,
    });
    expect(years.map((y) => y.year)).toEqual([2025]);
    expect(years[0].slots.map((s) => s.label)).toEqual(['Mar 2025']);
  });

  it('shows it while editing too, so it can be changed or removed', () => {
    const years = groupByYear([flower('2025-03-01')], {
      editing: true,
      now: AUG_2026,
    });
    const y2025 = years.find((y) => y.year === 2025)!;
    expect(y2025.slots.map((s) => s.label)).toContain('Mar 2025');
    // Still does not OFFER the empty months before June.
    expect(y2025.slots.map((s) => s.label)).not.toContain('Feb 2025');
    expect(y2025.slots.map((s) => s.label)).toContain('Jun 2025');
  });

  it('shows a bouquet from beyond the year we would offer', () => {
    const years = groupByYear([flower('2030-05-01')], {
      editing: true,
      now: AUG_2026,
    });
    expect(years[0].year).toBe(2030);
    expect(years[0].slots.map((s) => s.label)).toEqual(['May 2030']);
  });

  it('never offers an empty month outside the window', () => {
    const years = groupByYear([], { editing: true, now: AUG_2026 });
    const labels = years.flatMap((y) => y.slots.map((s) => s.label));
    expect(labels).not.toContain('May 2025');
    expect(labels).not.toContain('Jan 2027');
    expect(labels[labels.length - 1]).toBe('Jun 2025');
  });
});

describe('groupByYear — order', () => {
  it('walks straight back in time down the page', () => {
    const years = groupByYear([], { editing: true, now: AUG_2026 });
    const labels = years.flatMap((y) => y.slots.map((s) => s.key));
    // Every step down is older than the one above it — no zigzag at the
    // year boundary, which is what reading Jan..Dec inside a descending list
    // of years used to produce.
    for (let i = 1; i < labels.length; i++) {
      expect(labels[i] < labels[i - 1]).toBe(true);
    }
    expect(labels[0]).toBe('2026-12-01');
    expect(labels[labels.length - 1]).toBe('2025-06-01');
  });

  it('keeps that order when only some months are filled', () => {
    const years = groupByYear(
      [flower('2025-07-01'), flower('2026-02-01'), flower('2026-09-01')],
      { editing: false, now: AUG_2026 }
    );
    expect(years.flatMap((y) => y.slots.map((s) => s.key))).toEqual([
      '2026-09-01',
      '2026-02-01',
      '2025-07-01',
    ]);
  });
});

describe('currentMonthUtc', () => {
  it('is the month in UTC, not in whichever zone you are standing in', () => {
    // 23:30 on the 31st in Novosibirsk (UTC+7) is still the 31st in UTC, but
    // 04:00 on the 1st there is the previous month in UTC. Only one answer is
    // allowed, or the two of us would disagree about whether a bouquet is news.
    expect(currentMonthUtc(DateTime.fromISO('2026-09-01T04:00:00+07:00'))).toBe(
      '2026-08'
    );
    expect(currentMonthUtc(DateTime.fromISO('2026-08-31T20:00:00-04:00'))).toBe(
      '2026-09'
    );
  });

  it('reads as YYYY-MM so it compares straight against a stored date', () => {
    expect(currentMonthUtc(DateTime.fromISO('2026-08-12T12:00:00Z'))).toBe(
      '2026-08'
    );
  });
});
