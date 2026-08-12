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
  const years = new Set<number>();
  if (editing) {
    for (let y = FIRST_MONTH.year; y <= end; y++) years.add(y);
  } else {
    for (const key of byMonth.keys()) years.add(Number(key.slice(0, 4)));
  }

  return [...years]
    .sort((a, b) => b - a)
    .map((year) => {
      const from = year === FIRST_MONTH.year ? FIRST_MONTH.month : 1;
      const slots: MonthSlot[] = [];
      for (let m = from; m <= 12; m++) {
        const key = `${year}-${String(m).padStart(2, '0')}-01`;
        const flower = byMonth.get(key) ?? null;
        // Reading mode: only what exists. Editing: the whole open range.
        if (!editing && !flower) continue;
        if (editing && year > end) continue;
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
