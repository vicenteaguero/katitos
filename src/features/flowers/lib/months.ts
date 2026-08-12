import { DateTime } from '@kernel/lib';
import type { Flower } from '../types';

/** The first month we ever counted. Nothing before this exists. */
export const FIRST_MONTH = { year: 2025, month: 6 };

/** Any date → the first of its month, as 'YYYY-MM-01'. The storage key. */
export function monthKey(date: string): string {
  return `${date.slice(0, 7)}-01`;
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
