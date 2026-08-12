import { DateTime } from '@kernel/lib';
import type { Flower } from '../types';

/** Any date → the first of its month, as 'YYYY-MM-01'. The storage key. */
export function monthKey(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

/** 'Apr 2026' — the caption printed on the polaroid's chin. */
export function monthLabel(date: string): string {
  return DateTime.fromISO(date).toFormat('LLL yyyy');
}

export interface MonthSlot {
  /** 'YYYY-MM-01' */
  key: string;
  label: string;
  flower: Flower | null;
  /** A month that hasn't happened yet — nothing to add there. */
  future: boolean;
}

export interface FlowerYear {
  year: number;
  /** In edit mode all twelve; otherwise only the filled ones. */
  slots: MonthSlot[];
  filled: number;
}

/**
 * Arrange bouquets into years.
 *
 * Reading mode shows only the months that actually have a bouquet — a wall of
 * empty frames is not a nice thing to look at. Edit mode shows all twelve of a
 * year, so she can tap the one she wants to fill or change.
 */
export function groupByYear(
  flowers: Flower[],
  { editing, now = DateTime.now() }: { editing: boolean; now?: DateTime }
): FlowerYear[] {
  const byMonth = new Map<string, Flower>();
  for (const f of flowers) byMonth.set(monthKey(f.occasion_date), f);

  const years = new Set<number>();
  for (const key of byMonth.keys()) years.add(Number(key.slice(0, 4)));
  // In edit mode the current year is always offered, even before its first
  // bouquet exists — otherwise there'd be nowhere to put the first one.
  if (editing) years.add(now.year);

  return [...years]
    .sort((a, b) => b - a)
    .map((year) => {
      const slots: MonthSlot[] = [];
      for (let m = 1; m <= 12; m++) {
        const key = `${year}-${String(m).padStart(2, '0')}-01`;
        const flower = byMonth.get(key) ?? null;
        const future = year > now.year || (year === now.year && m > now.month);
        if (!editing && !flower) continue;
        if (editing && future && !flower) continue;
        slots.push({ key, label: monthLabel(key), flower, future });
      }
      return {
        year,
        slots,
        filled: slots.filter((s) => s.flower).length,
      };
    })
    .filter((y) => y.slots.length > 0);
}
