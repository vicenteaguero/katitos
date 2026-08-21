import { describe, expect, it } from 'vitest';
import {
  BASE_W,
  filmLayout,
  offsetInFrame,
  layoutSticker,
  PAGE_H,
  PAGE_W,
  stickerMatrix,
} from './pdf-layout';

const at = (x: number, y: number, extra = {}) => ({
  x,
  y,
  scale: 1,
  rotation: 0,
  ...extra,
});

describe('layoutSticker', () => {
  it('flips the vertical axis — PDF counts up, the screen counts down', () => {
    // Near the TOP of the screen (y = 0.1) is near the TOP of the paper, which
    // in PDF coordinates is a LARGE y.
    expect(layoutSticker(at(0.5, 0.1)).cy).toBeCloseTo(0.9 * PAGE_H);
    expect(layoutSticker(at(0.5, 0.9)).cy).toBeCloseTo(0.1 * PAGE_H);
  });

  it('leaves the horizontal axis alone', () => {
    expect(layoutSticker(at(0.25, 0.5)).cx).toBeCloseTo(0.25 * PAGE_W);
  });

  it('turns the other way round than CSS does', () => {
    expect(layoutSticker(at(0.5, 0.5, { rotation: 12 })).rotation).toBe(-12);
  });

  it('sizes from the same 42% the screen uses, times the scale', () => {
    expect(layoutSticker(at(0.5, 0.5, { scale: 2 })).w).toBeCloseTo(
      BASE_W * 2 * PAGE_W
    );
  });

  it('keeps a photo’s real proportions when it knows them', () => {
    const box = layoutSticker(at(0.5, 0.5, { width: 4000, height: 3000 }));
    expect(box.h / box.w).toBeCloseTo(0.75);
  });

  it('falls back to square for a photo of unknown size', () => {
    const box = layoutSticker(at(0.5, 0.5));
    expect(box.h).toBeCloseTo(box.w);
  });

  it('does not divide by a zero-width photo', () => {
    const box = layoutSticker(at(0.5, 0.5, { width: 0, height: 900 }));
    expect(Number.isFinite(box.h)).toBe(true);
  });
});

describe('stickerMatrix', () => {
  /** Apply a PDF `cm` matrix to a point in the unit square. */
  const apply = (
    m: [number, number, number, number, number, number],
    x: number,
    y: number
  ) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });

  it('puts the unit square exactly where the box says', () => {
    const box = { cx: 300, cy: 400, w: 100, h: 50, rotation: 0 };
    const m = stickerMatrix(box);
    expect(apply(m, 0, 0)).toEqual({ x: 250, y: 375 });
    expect(apply(m, 1, 1)).toEqual({ x: 350, y: 425 });
  });

  it('keeps the centre fixed while turning', () => {
    const box = { cx: 300, cy: 400, w: 100, h: 50, rotation: 37 };
    const m = stickerMatrix(box);
    const a = apply(m, 0, 0);
    const b = apply(m, 1, 1);
    expect((a.x + b.x) / 2).toBeCloseTo(300);
    expect((a.y + b.y) / 2).toBeCloseTo(400);
  });

  it('a quarter turn swaps the sides — and turns the RIGHT way', () => {
    const m = stickerMatrix({ cx: 0, cy: 0, w: 100, h: 50, rotation: 90 });
    const a = apply(m, 0, 0);
    const b = apply(m, 1, 0);
    expect(b.x - a.x).toBeCloseTo(0);
    // Signed, not a distance. `hypot` alone passed just as happily when the
    // matrix rotated the opposite way, which would print every tilted photo
    // mirrored about its own centre.
    expect(b.y - a.y).toBeCloseTo(100);
  });

  it('turns counter-clockwise in PDF space, which is clockwise on screen', () => {
    // layoutSticker already negates the CSS angle; a second negation here
    // would cancel it out and no other test would notice.
    const m = stickerMatrix({ cx: 0, cy: 0, w: 100, h: 100, rotation: 45 });
    const a = apply(m, 0, 0);
    const b = apply(m, 1, 0);
    expect(b.x - a.x).toBeCloseTo(Math.SQRT1_2 * 100);
    expect(b.y - a.y).toBeCloseTo(Math.SQRT1_2 * 100);
  });
});

describe('offsetInFrame', () => {
  it('is a plain shift when the sticker is level', () => {
    const out = offsetInFrame({ cx: 100, cy: 100, rotation: 0 }, 10, 20);
    expect(out).toEqual({ cx: 110, cy: 120 });
  });

  it('turns the offset with the sticker', () => {
    // A quarter turn sends "10 to the right" straight up the page.
    const out = offsetInFrame({ cx: 0, cy: 0, rotation: 90 }, 10, 0);
    expect(out.cx).toBeCloseTo(0);
    expect(out.cy).toBeCloseTo(10);
  });

  it('keeps the photo on its plate at an everyday tilt', () => {
    // The distance from the plate's centre must not change when it tilts —
    // that is precisely what slid the photograph off the frame.
    const level = offsetInFrame({ cx: 0, cy: 0, rotation: 0 }, 12, -30);
    const tilted = offsetInFrame({ cx: 0, cy: 0, rotation: 7 }, 12, -30);
    expect(Math.hypot(tilted.cx, tilted.cy)).toBeCloseTo(
      Math.hypot(level.cx, level.cy)
    );
    expect(tilted.cx).not.toBeCloseTo(level.cx);
  });
});

describe('filmLayout', () => {
  it('gives the photo a square window', () => {
    const { window } = filmLayout(200);
    expect(window.size).toBeCloseTo(200 - 2 * 200 * 0.06);
  });

  it('makes the chin deeper than the other three edges', () => {
    const { plate, window } = filmLayout(200);
    const top = plate.h - (window.y + window.size);
    expect(window.y).toBeGreaterThan(top);
  });

  it('is taller than it is wide, like real instant film', () => {
    const { plate } = filmLayout(200);
    expect(plate.h).toBeGreaterThan(plate.w);
  });
});

describe('layoutSticker with a shape', () => {
  it('prints a shaped photo as the shape, not as the photograph', () => {
    const wide = {
      x: 0.5,
      y: 0.5,
      scale: 1,
      rotation: 0,
      width: 3000,
      height: 2000,
    };
    const asIs = layoutSticker({ ...wide, shape: 'natural' });
    const round = layoutSticker({ ...wide, shape: 'circle' });
    // A circle is square: same width and height.
    expect(round.w).toBeCloseTo(round.h, 6);
    // …and narrower than the landscape it was cut out of.
    expect(round.w).toBeLessThan(asIs.w);
  });

  it('keeps the arch upright', () => {
    const box = layoutSticker({
      x: 0.5,
      y: 0.5,
      scale: 1,
      rotation: 0,
      width: 3000,
      height: 2000,
      shape: 'arch',
    });
    expect(box.w / box.h).toBeCloseTo(0.75, 6);
  });
});
