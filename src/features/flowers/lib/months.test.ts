import { describe, expect, it } from 'vitest';
import { DateTime } from '@kernel/lib';
import type { Flower } from '../types';
import { groupByYear, monthKey, monthLabel } from './months';

const NOW = DateTime.fromISO('2026-08-11T12:00:00Z', { zone: 'utc' });

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

describe('monthKey', () => {
  it('pins any day to the first of its month', () => {
    expect(monthKey('2026-04-17')).toBe('2026-04-01');
    expect(monthKey('2026-04-01')).toBe('2026-04-01');
  });
});

describe('monthLabel', () => {
  it('reads the way it will be printed on the photo', () => {
    expect(monthLabel('2026-04-01')).toBe('Apr 2026');
    expect(monthLabel('2025-07-01')).toBe('Jul 2025');
  });
});

describe('groupByYear', () => {
  const flowers = [
    flower('2026-04-01'),
    flower('2026-07-01'),
    flower('2025-12-01'),
  ];

  it('shows only the filled months when just looking', () => {
    const years = groupByYear(flowers, { editing: false, now: NOW });
    expect(years.map((y) => y.year)).toEqual([2026, 2025]);
    expect(years[0].slots.map((s) => s.label)).toEqual([
      'Apr 2026',
      'Jul 2026',
    ]);
    expect(years[1].slots.map((s) => s.label)).toEqual(['Dec 2025']);
  });

  it('newest year first — this year is what you look at', () => {
    const years = groupByYear(flowers, { editing: false, now: NOW });
    expect(years[0].year).toBeGreaterThan(years[1].year);
  });

  it('offers every month so far when editing, so any can be filled', () => {
    const years = groupByYear(flowers, { editing: true, now: NOW });
    const thisYear = years.find((y) => y.year === 2026)!;
    // January through August (today is 11 Aug) — eight slots.
    expect(thisYear.slots).toHaveLength(8);
    expect(thisYear.slots[0].label).toBe('Jan 2026');
    expect(thisYear.slots[7].label).toBe('Aug 2026');
  });

  it('never offers a month that has not happened yet', () => {
    const years = groupByYear(flowers, { editing: true, now: NOW });
    const labels = years.flatMap((y) => y.slots.map((s) => s.label));
    expect(labels).not.toContain('Sep 2026');
    expect(labels).not.toContain('Dec 2026');
  });

  it('still shows a past year in full when editing', () => {
    const years = groupByYear(flowers, { editing: true, now: NOW });
    expect(years.find((y) => y.year === 2025)!.slots).toHaveLength(12);
  });

  it('gives the current year somewhere to start when nothing exists yet', () => {
    const years = groupByYear([], { editing: true, now: NOW });
    expect(years).toHaveLength(1);
    expect(years[0].year).toBe(2026);
    expect(years[0].filled).toBe(0);
  });

  it('shows nothing at all when just looking at an empty shelf', () => {
    expect(groupByYear([], { editing: false, now: NOW })).toEqual([]);
  });

  it('counts how many of a year are filled', () => {
    const years = groupByYear(flowers, { editing: true, now: NOW });
    expect(years.find((y) => y.year === 2026)!.filled).toBe(2);
  });

  it('tolerates a bouquet stored on a mid-month day', () => {
    const years = groupByYear([flower('2026-04-17')], {
      editing: false,
      now: NOW,
    });
    expect(years[0].slots[0].label).toBe('Apr 2026');
  });
});
