import { describe, expect, it } from 'vitest';
import { cropMatrix, cropWindow, NO_CROP, panCrop, slackOf } from './crop-math';

describe('cropWindow', () => {
  it('shows the whole picture when the frame is its own shape', () => {
    expect(cropWindow(1.5, 1.5, NO_CROP)).toEqual({ u: 0, v: 0, w: 1, h: 1 });
  });

  it('trims the sides of a wide photo in a square frame', () => {
    const win = cropWindow(1, 2, NO_CROP); // 2:1 photo, square hole
    expect(win.w).toBeCloseTo(0.5, 6);
    expect(win.h).toBe(1);
    expect(win.u).toBeCloseTo(0.25, 6); // centred: a quarter off each side
  });

  it('trims the top and bottom of a tall photo in a square frame', () => {
    const win = cropWindow(1, 0.5, NO_CROP);
    expect(win.h).toBeCloseTo(0.5, 6);
    expect(win.w).toBe(1);
    expect(win.v).toBeCloseTo(0.25, 6);
  });

  it('honours the focal point', () => {
    const left = cropWindow(1, 2, { cropX: 0, cropY: 0.5, cropZoom: 1 });
    expect(left.u).toBe(0); // hard against the left edge
    const right = cropWindow(1, 2, { cropX: 1, cropY: 0.5, cropZoom: 1 });
    expect(right.u + right.w).toBeCloseTo(1, 6);
  });

  it('zooming shrinks the window about the focal point', () => {
    const c = { cropX: 0.5, cropY: 0.5, cropZoom: 2 };
    const win = cropWindow(1, 1, c);
    expect(win.w).toBeCloseTo(0.5, 6);
    expect(win.h).toBeCloseTo(0.5, 6);
    // still centred
    expect(win.u + win.w / 2).toBeCloseTo(0.5, 6);
  });

  it('never lets the window escape the picture', () => {
    for (const cropX of [0, 0.3, 1]) {
      for (const zoom of [1, 1.7, 6]) {
        for (const ratio of [0.4, 1, 3]) {
          const win = cropWindow(0.75, ratio, {
            cropX,
            cropY: cropX,
            cropZoom: zoom,
          });
          expect(win.u).toBeGreaterThanOrEqual(-1e-9);
          expect(win.v).toBeGreaterThanOrEqual(-1e-9);
          expect(win.u + win.w).toBeLessThanOrEqual(1 + 1e-9);
          expect(win.v + win.h).toBeLessThanOrEqual(1 + 1e-9);
        }
      }
    }
  });
});

describe('panCrop', () => {
  it('moves the picture with the finger', () => {
    const c = { cropX: 0.5, cropY: 0.5, cropZoom: 2 };
    const win = cropWindow(1, 1, c);
    // Dragging right shows what was off to the left → focal point moves left.
    const out = panCrop(c, win, 20, 0, 200, 200);
    expect(out.cropX).toBeLessThan(0.5);
  });

  it('does nothing on an axis with no slack, instead of exploding', () => {
    // The frame is exactly the photo's shape at zoom 1: nothing to pan, and
    // the naive arithmetic here divides by zero and writes NaN to the database.
    const c = NO_CROP;
    const win = cropWindow(1.5, 1.5, c);
    expect(slackOf(win)).toEqual({ x: 0, y: 0 });
    const out = panCrop(c, win, 50, -80, 200, 200);
    expect(out.cropX).toBe(0.5);
    expect(out.cropY).toBe(0.5);
    expect(Number.isFinite(out.cropX)).toBe(true);
  });

  it('stops at the edge of the picture', () => {
    const c = { cropX: 0.5, cropY: 0.5, cropZoom: 2 };
    const win = cropWindow(1, 1, c);
    expect(panCrop(c, win, 100000, 0, 200, 200).cropX).toBe(0);
    expect(panCrop(c, win, -100000, 0, 200, 200).cropX).toBe(1);
  });
});

describe('cropMatrix', () => {
  it('is the identity when the whole picture is shown', () => {
    expect(cropMatrix({ u: 0, v: 0, w: 1, h: 1 })).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it('flips the vertical, because PDF counts up and we count down', () => {
    // Top half of the image (v = 0, h = 0.5) must sit at the TOP of the frame,
    // i.e. its own bottom edge lands at y = -0.5 in frame units.
    const top = cropMatrix({ u: 0, v: 0, w: 1, h: 0.5 });
    expect(top[5]).toBeCloseTo(-1, 6);
    const bottom = cropMatrix({ u: 0, v: 0.5, w: 1, h: 0.5 });
    expect(bottom[5]).toBeCloseTo(0, 6);
  });

  it('scales by the inverse of the window', () => {
    const m = cropMatrix({ u: 0.25, v: 0, w: 0.5, h: 1 });
    expect(m[0]).toBeCloseTo(2, 6);
    expect(m[4]).toBeCloseTo(-0.5, 6);
  });
});
