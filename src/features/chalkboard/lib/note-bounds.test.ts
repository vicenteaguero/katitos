import { describe, expect, it } from 'vitest';
import { clampToBounds, noteBounds, visualHalfExtents } from './note-bounds';

const board = { boardW: 360, boardH: 640 };

describe('visualHalfExtents', () => {
  it('is half the box when nothing is transformed', () => {
    expect(visualHalfExtents(200, 80, 1, 0)).toEqual({ halfW: 100, halfH: 40 });
  });

  it('scales with the note', () => {
    expect(visualHalfExtents(200, 80, 0.5, 0)).toEqual({
      halfW: 50,
      halfH: 20,
    });
  });

  it('grows when the note is tilted — both edges project onto both axes', () => {
    const { halfW } = visualHalfExtents(200, 80, 1, 90);
    // Turned on its side, the width you see is the note's height.
    expect(halfW).toBeCloseTo(40, 5);
    const tilted = visualHalfExtents(200, 80, 1, 10);
    expect(tilted.halfW).toBeGreaterThan(100);
  });

  it('ignores the sign of the tilt', () => {
    expect(visualHalfExtents(200, 80, 1, -12)).toEqual(
      visualHalfExtents(200, 80, 1, 12)
    );
  });
});

describe('noteBounds', () => {
  it('matches the naive box when untransformed', () => {
    const b = noteBounds({ ...board, w: 200, h: 80, scale: 1, rotation: 0 });
    expect(b).toEqual({ minX: 0, maxX: 160, minY: 0, maxY: 560 });
  });

  it('lets a shrunken note reach the right edge — the bug', () => {
    // Half size: the visible note is 100px wide, so its right edge can travel
    // 100px further than the old `boardW - offsetWidth` allowed.
    const b = noteBounds({ ...board, w: 200, h: 80, scale: 0.5, rotation: 0 });
    expect(b.maxX).toBe(210);
    // And the visible right edge lands exactly on the slate's edge.
    expect(b.maxX + 200 / 2 + 50).toBe(360);
  });

  it('lets a shrunken note reach the left edge too', () => {
    const b = noteBounds({ ...board, w: 200, h: 80, scale: 0.5, rotation: 0 });
    expect(b.minX).toBe(-50);
    expect(b.minX + 200 / 2 - 50).toBe(0);
  });

  it('holds an enlarged note in, so it cannot spill off the slate', () => {
    const b = noteBounds({ ...board, w: 200, h: 80, scale: 1.5, rotation: 0 });
    expect(b.minX).toBe(50);
    expect(b.maxX).toBe(110);
  });

  it('gives a tilted note less room, not more', () => {
    const flat = noteBounds({ ...board, w: 200, h: 80, scale: 1, rotation: 0 });
    const tilted = noteBounds({
      ...board,
      w: 200,
      h: 80,
      scale: 1,
      rotation: 12,
    });
    expect(tilted.maxX).toBeLessThan(flat.maxX);
    expect(tilted.minX).toBeGreaterThan(flat.minX);
  });

  it('collapses to a single spot when the note is wider than the slate', () => {
    const b = noteBounds({ ...board, w: 500, h: 80, scale: 1, rotation: 0 });
    expect(b.minX).toBe(b.maxX);
    // Centred, rather than refusing to place it at all.
    expect(b.minX + 500 / 2).toBe(180);
  });
});

describe('clampToBounds', () => {
  it('leaves a legal position alone', () => {
    const b = noteBounds({ ...board, w: 200, h: 80, scale: 1, rotation: 0 });
    expect(clampToBounds(20, 30, b)).toEqual({ x: 20, y: 30 });
  });

  it('pulls an escaped note back to the edge', () => {
    const b = noteBounds({ ...board, w: 200, h: 80, scale: 1, rotation: 0 });
    expect(clampToBounds(9999, -50, b)).toEqual({ x: 160, y: 0 });
  });
});
