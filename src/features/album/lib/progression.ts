import type { DateTime } from 'luxon';

/**
 * Pure progression + book-layout math for the Pololini Album. Structural types
 * (not DB types) keep this trivially testable.
 */

export interface SlotLike {
  id: string;
  chapter_id: string;
  position: number;
  tier: string; // 'common' | 'rare' | 'foil'
  is_duo: boolean;
  gate_start_doy: number | null;
  gate_end_doy: number | null;
}
export interface StickerLike {
  slot_id: string;
  half: string; // 'solo' | 'a' | 'b'
}
export interface ChapterLike {
  id: string;
  position: number;
}

export const SLOTS_PER_PAGE = 6;

/** Day-of-year 1..366 (Luxon handles leap years). */
export function dayOfYear(date: DateTime): number {
  return date.ordinal;
}

/** Time-gate open today? No gate → always open. Wrap-aware (Dec→Jan). */
export function isGateOpen(slot: SlotLike, todayDoy: number): boolean {
  const s = slot.gate_start_doy;
  const e = slot.gate_end_doy;
  if (s == null || e == null) return true;
  return s <= e
    ? todayDoy >= s && todayDoy <= e
    : todayDoy >= s || todayDoy <= e;
}

/** A slot is complete when a solo has 1 sticker, or a duo has both halves. */
export function slotComplete(slot: SlotLike, halves: StickerLike[]): boolean {
  if (slot.is_duo) {
    const set = new Set(halves.map((h) => h.half));
    return set.has('a') && set.has('b');
  }
  return halves.length > 0;
}

/** Which duo half is still missing (for the "waiting for partner" prompt). */
export function duoMissingHalf(
  slot: SlotLike,
  halves: StickerLike[]
): 'a' | 'b' | null {
  if (!slot.is_duo) return null;
  const set = new Set(halves.map((h) => h.half));
  if (!set.has('a')) return 'a';
  if (!set.has('b')) return 'b';
  return null;
}

export interface ChapterProgress {
  total: number;
  filled: number;
  pct: number;
}
export interface AlbumProgress {
  total: number;
  filled: number;
  pct: number;
  foilsTotal: number;
  foilsFilled: number;
  byChapter: Record<string, ChapterProgress>;
}

export function computeProgress(
  slots: SlotLike[],
  stickersBySlot: Map<string, StickerLike[]>,
  _todayDoy: number
): AlbumProgress {
  let filled = 0;
  let foilsTotal = 0;
  let foilsFilled = 0;
  const byChapter: Record<string, ChapterProgress> = {};
  for (const slot of slots) {
    const complete = slotComplete(slot, stickersBySlot.get(slot.id) ?? []);
    const ch = (byChapter[slot.chapter_id] ??= { total: 0, filled: 0, pct: 0 });
    ch.total += 1;
    if (complete) {
      ch.filled += 1;
      filled += 1;
    }
    if (slot.tier === 'foil') {
      foilsTotal += 1;
      if (complete) foilsFilled += 1;
    }
  }
  for (const ch of Object.values(byChapter)) {
    ch.pct = ch.total === 0 ? 0 : Math.round((ch.filled / ch.total) * 100);
  }
  const total = slots.length;
  return {
    total,
    filled,
    pct: total === 0 ? 0 : Math.round((filled / total) * 100),
    foilsTotal,
    foilsFilled,
    byChapter,
  };
}

export type Page =
  | { kind: 'cover' }
  | { kind: 'toc' }
  | { kind: 'divider'; chapterId: string }
  | { kind: 'grid'; chapterId: string; slotIds: string[] }
  | { kind: 'blank' };

/**
 * Deterministic book layout: Cover (recto), TOC, then per chapter a divider
 * (starts a fresh leaf) + grid pages of 6 slots. Padded to an even page count
 * so spreads pair cleanly.
 */
export function buildPageList(
  chapters: ChapterLike[],
  slots: SlotLike[]
): Page[] {
  const pages: Page[] = [{ kind: 'cover' }, { kind: 'toc' }];
  const sortedChapters = [...chapters].sort((a, b) => a.position - b.position);
  for (const ch of sortedChapters) {
    pages.push({ kind: 'divider', chapterId: ch.id });
    const chSlots = slots
      .filter((s) => s.chapter_id === ch.id)
      .sort((a, b) => a.position - b.position);
    for (let i = 0; i < chSlots.length; i += SLOTS_PER_PAGE) {
      pages.push({
        kind: 'grid',
        chapterId: ch.id,
        slotIds: chSlots.slice(i, i + SLOTS_PER_PAGE).map((s) => s.id),
      });
    }
  }
  if (pages.length % 2 !== 0) pages.push({ kind: 'blank' });
  return pages;
}
