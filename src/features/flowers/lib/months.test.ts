import { describe, expect, it } from 'vitest';
import { DateTime } from '@kernel/lib';
import type { Flower } from '../types';
import { groupByYear, lastYear, monthKey, monthLabel } from './months';

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
      'Apr 2026',
      'Jul 2026',
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
    expect(first.slots[0].label).toBe('Jun 2025');
    expect(first.slots).toHaveLength(7); // Jun..Dec
  });

  it('opens the whole current year, not just the months already past', () => {
    const years = groupByYear([], { editing: true, now: AUG_2026 });
    const y2026 = years.find((y) => y.year === 2026)!;
    expect(y2026.slots).toHaveLength(12);
    expect(y2026.slots[11].label).toBe('Dec 2026');
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
