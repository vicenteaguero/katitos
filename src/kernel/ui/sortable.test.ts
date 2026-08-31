import { describe, expect, it } from 'vitest';
import { dropIndexAt, moveItem } from './sortable';

describe('moveItem', () => {
  it('moves one item down and up', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('leaves the list alone for a move to itself, and never throws on the ends', () => {
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
    expect(moveItem(['a', 'b'], -3, 9)).toEqual(['b', 'a']);
    expect(moveItem([], 0, 0)).toEqual([]);
  });

  it('returns a new array', () => {
    const list = ['a', 'b'];
    expect(moveItem(list, 0, 0)).not.toBe(list);
  });
});

describe('dropIndexAt', () => {
  const rows = [
    { top: 0, bottom: 40 },
    { top: 40, bottom: 80 },
    { top: 80, bottom: 120 },
  ];
  it('drops before a row above its midpoint and after it below', () => {
    expect(dropIndexAt(5, rows)).toBe(0);
    expect(dropIndexAt(35, rows)).toBe(1);
    expect(dropIndexAt(61, rows)).toBe(2);
    expect(dropIndexAt(500, rows)).toBe(2);
  });
  it('is zero for no rows', () => {
    expect(dropIndexAt(10, [])).toBe(0);
  });
});
