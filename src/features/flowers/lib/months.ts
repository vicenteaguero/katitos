import { DateTime } from '@kernel/lib';
import type { Flower } from '../types';

/** The first month we ever counted. Nothing before this exists. */
export const FIRST_MONTH = { year: 2025, month: 6 };

/** Any date → the first of its month, as 'YYYY-MM-01'. The storage key. */
export function monthKey(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

/**
 * This month, as 'YYYY-MM', in UTC.
 *
 * Deliberately UTC and not either of our zones: it decides whether adding a
 * bouquet is news worth a notification, and that answer should not depend on
 * which of us is holding the phone.
 */
export function currentMonthUtc(now: DateTime = DateTime.utc()): string {
  return now.toUTC().toFormat('yyyy-MM');
}

/** 'Apr 2026' — the caption printed on the polaroid's chin. */
export function monthLabel(date: string): string {
  return DateTime.fromISO(date).toFormat('LLL yyyy');
}

/**
 * The last year you can put a bouquet in.
 *
 * The whole current year is always open — she shouldn't have to wait for a
 * month to arrive before filling it. And once December comes round, next year
 * opens too, so there is never a moment where the shelf has run out of room.
 */
export function lastYear(now: DateTime = DateTime.now()): number {
  return now.month === 12 ? now.year + 1 : now.year;
}

export interface MonthSlot {
  /** 'YYYY-MM-01' */
  key: string;
  label: string;
  flower: Flower | null;
}

/**
 * Every month from June 2025 to this one, newest first — the shape the page has
 * before anything has loaded.
 *
 * The loading state used to be six anonymous tiles, so the page jumped from a
 * short block to a tall one the moment the rows landed. Laying out the real
 * months up front means the skeleton IS the page, and only the photos fade in.
 */
export function allMonthsToNow(now: DateTime = DateTime.now()): string[] {
  const keys: string[] = [];
  let cursor = DateTime.fromObject({
    year: FIRST_MONTH.year,
    month: FIRST_MONTH.month,
    day: 1,
  });
  const end = now.startOf('month');
  while (cursor <= end) {
    keys.push(cursor.toFormat('yyyy-MM-01'));
    cursor = cursor.plus({ months: 1 });
  }
  return keys.reverse();
}

/** Those months grouped into years, newest year first — skeleton scaffolding. */
export function skeletonYears(
  now: DateTime = DateTime.now()
): { year: number; months: string[] }[] {
  const byYear = new Map<number, string[]>();
  for (const key of allMonthsToNow(now)) {
    const year = Number(key.slice(0, 4));
    const list = byYear.get(year);
    if (list) list.push(key);
    else byYear.set(year, [key]);
  }
  return [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, months]) => ({ year, months }));
}

export interface FlowerYear {
  year: number;
  /** In edit mode every month in range; otherwise only the filled ones. */
  slots: MonthSlot[];
  filled: number;
  total: number;
}

/**
 * Arrange bouquets into years.
 *
 * Reading mode shows only the months that actually have a bouquet — a wall of
 * empty frames is a list of things you didn't do. Edit mode shows every month
 * from June 2025 to the end of the open year, so she can tap the one she wants.
 */
export function groupByYear(
  flowers: Flower[],
  { editing, now = DateTime.now() }: { editing: boolean; now?: DateTime }
): FlowerYear[] {
  const byMonth = new Map<string, Flower>();
  for (const f of flowers) byMonth.set(monthKey(f.occasion_date), f);

  const end = lastYear(now);

  /**
   * Is this an empty month we're willing to OFFER?
   *
   * June 2025 is where we started counting and `end` is as far ahead as we let
   * her reach. This governs empty slots only — it must never decide whether an
   * existing photo is shown.
   */
  const offerable = (year: number, month: number) =>
    year >= FIRST_MONTH.year &&
    year <= end &&
    (year > FIRST_MONTH.year || month >= FIRST_MONTH.month);

  // Every year we'd offer, PLUS every year that already holds a bouquet. That
  // union is the point: a photo outside the offerable window is still a photo,
  // and filtering it out would hide it with no way to reach or remove it.
  const years = new Set<number>();
  if (editing) for (let y = FIRST_MONTH.year; y <= end; y++) years.add(y);
  for (const key of byMonth.keys()) years.add(Number(key.slice(0, 4)));

  return [...years]
    .sort((a, b) => b - a)
    .map((year) => {
      const slots: MonthSlot[] = [];
      // Newest month first, like the years around them. Scrolling down walks
      // steadily backwards — the most recent bouquet at the top, June 2025 at
      // the very bottom. Counting up inside a year while counting down between
      // them made time zigzag down the page.
      for (let m = 12; m >= 1; m--) {
        const key = `${year}-${String(m).padStart(2, '0')}-01`;
        const flower = byMonth.get(key) ?? null;
        // A bouquet always shows, wherever it sits. An empty month shows only
        // while editing, and only where we're willing to offer one.
        if (!flower && !(editing && offerable(year, m))) continue;
        slots.push({ key, label: monthLabel(key), flower });
      }
      return {
        year,
        slots,
        filled: slots.filter((s) => s.flower).length,
        total: slots.length,
      };
    })
    .filter((y) => y.slots.length > 0);
}
