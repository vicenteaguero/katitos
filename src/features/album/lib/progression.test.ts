import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import {
  buildPageList,
  computeProgress,
  dayOfYear,
  duoMissingHalf,
  isGateOpen,
  slotComplete,
  type ChapterLike,
  type SlotLike,
  type StickerLike,
} from './progression';

function slot(p: Partial<SlotLike> & { id: string }): SlotLike {
  return {
    chapter_id: 'c1',
    position: 0,
    tier: 'common',
    is_duo: false,
    gate_start_doy: null,
    gate_end_doy: null,
    ...p,
  };
}

describe('dayOfYear', () => {
  it('Jan 1 = 1, Dec 31 leap = 366', () => {
    expect(dayOfYear(DateTime.fromISO('2028-01-01'))).toBe(1);
    expect(dayOfYear(DateTime.fromISO('2028-12-31'))).toBe(366);
  });
});

describe('isGateOpen', () => {
  it('no gate → always open', () => {
    expect(isGateOpen(slot({ id: 's' }), 200)).toBe(true);
  });
  it('same-year window', () => {
    const s = slot({ id: 's', gate_start_doy: 152, gate_end_doy: 243 });
    expect(isGateOpen(s, 200)).toBe(true);
    expect(isGateOpen(s, 10)).toBe(false);
  });
  it('wrap-around window (Dec → Jan)', () => {
    const s = slot({ id: 's', gate_start_doy: 355, gate_end_doy: 5 });
    expect(isGateOpen(s, 360)).toBe(true);
    expect(isGateOpen(s, 3)).toBe(true);
    expect(isGateOpen(s, 180)).toBe(false);
  });
});

describe('slotComplete / duoMissingHalf', () => {
  const stk = (half: string): StickerLike => ({ slot_id: 's', half });
  it('solo needs one sticker', () => {
    expect(slotComplete(slot({ id: 's' }), [])).toBe(false);
    expect(slotComplete(slot({ id: 's' }), [stk('solo')])).toBe(true);
  });
  it('duo needs both halves', () => {
    const s = slot({ id: 's', is_duo: true });
    expect(slotComplete(s, [stk('a')])).toBe(false);
    expect(slotComplete(s, [stk('a'), stk('b')])).toBe(true);
    expect(duoMissingHalf(s, [stk('a')])).toBe('b');
    expect(duoMissingHalf(s, [stk('a'), stk('b')])).toBe(null);
  });
});

describe('computeProgress', () => {
  it('counts overall, per-chapter, and foils; respects duo completeness', () => {
    const slots = [
      slot({ id: 's1', chapter_id: 'c1', tier: 'foil' }),
      slot({ id: 's2', chapter_id: 'c1' }),
      slot({ id: 's3', chapter_id: 'c2', is_duo: true }),
    ];
    const by = new Map<string, StickerLike[]>([
      ['s1', [{ slot_id: 's1', half: 'solo' }]],
      ['s3', [{ slot_id: 's3', half: 'a' }]], // duo incomplete
    ]);
    const p = computeProgress(slots, by, 100);
    expect(p.total).toBe(3);
    expect(p.filled).toBe(1); // only s1
    expect(p.pct).toBe(33);
    expect(p.foilsTotal).toBe(1);
    expect(p.foilsFilled).toBe(1);
    expect(p.byChapter.c1).toEqual({ total: 2, filled: 1, pct: 50 });
    expect(p.byChapter.c2).toEqual({ total: 1, filled: 0, pct: 0 });
  });
  it('empty album → 0%', () => {
    expect(computeProgress([], new Map(), 1).pct).toBe(0);
  });
});

describe('buildPageList', () => {
  it('cover, toc, then divider + grids per chapter, padded even', () => {
    const chapters: ChapterLike[] = [
      { id: 'c1', position: 1 },
      { id: 'c2', position: 2 },
    ];
    const slots: SlotLike[] = [];
    for (let i = 0; i < 7; i++)
      slots.push(slot({ id: `a${i}`, chapter_id: 'c1', position: i }));
    for (let i = 0; i < 3; i++)
      slots.push(slot({ id: `b${i}`, chapter_id: 'c2', position: i }));
    const pages = buildPageList(chapters, slots);
    expect(pages[0]).toEqual({ kind: 'cover' });
    expect(pages[1]).toEqual({ kind: 'toc' });
    expect(pages[2]).toEqual({ kind: 'divider', chapterId: 'c1' });
    // c1: 7 slots → 2 grid pages (6 + 1)
    expect(pages[3]).toMatchObject({ kind: 'grid', chapterId: 'c1' });
    expect((pages[3] as { slotIds: string[] }).slotIds).toHaveLength(6);
    expect((pages[4] as { slotIds: string[] }).slotIds).toHaveLength(1);
    expect(pages[5]).toEqual({ kind: 'divider', chapterId: 'c2' });
    expect(pages.length % 2).toBe(0); // padded even
  });
});
