import { describe, expect, it } from 'vitest';
import {
  computeLayout,
  decideGesture,
  restFor,
  slideDx,
  stepCrossing,
} from './book-geometry';

const M = 10;
const MIN_PEEK = 40;

describe('computeLayout', () => {
  it('aligns page 1 to the left padding and page 2 to the right padding', () => {
    const elW = 360;
    const { pageW, restL, restR } = computeLayout(elW, 600, M, MIN_PEEK);
    // Focus-left: left page (track x = M) lands at content-left (0).
    expect(M + restL).toBe(0);
    // Focus-right: right page's right edge (track x = M + 2*pageW) lands at elW.
    expect(M + 2 * pageW + restR).toBe(elW);
  });

  it('always keeps at least MIN_PEEK of the facing page visible', () => {
    const elW = 360;
    const { pageW } = computeLayout(elW, 100000, M, MIN_PEEK); // height not limiting
    expect(pageW).toBeLessThanOrEqual(elW - MIN_PEEK);
  });

  it('is height-driven when height is the tighter constraint', () => {
    const elW = 1000; // very wide
    const { pageW } = computeLayout(elW, 400, M, MIN_PEEK);
    // byH = floor((400 - 20) * 0.75) = 285 < elW - MIN_PEEK
    expect(pageW).toBe(285);
  });

  it('never goes below the 200px floor on a small screen', () => {
    const { pageW } = computeLayout(292, 300, M, MIN_PEEK);
    expect(pageW).toBeGreaterThanOrEqual(200);
  });
});

describe('decideGesture', () => {
  const count = 4; // spreads [0|1] [2|3]

  it('left page: left half flips back, right half slides forward', () => {
    expect(decideGesture(2, count, true, false)).toEqual({
      mode: 'flip',
      target: 1,
    });
    expect(decideGesture(2, count, false, false)).toEqual({
      mode: 'slide',
      target: 3,
    });
  });

  it('right page: left half slides back, right half flips forward', () => {
    expect(decideGesture(1, count, true, false)).toEqual({
      mode: 'slide',
      target: 0,
    });
    expect(decideGesture(1, count, false, false)).toEqual({
      mode: 'flip',
      target: 2,
    });
  });

  it('blocks at the very start (no previous spread)', () => {
    expect(decideGesture(0, count, true, false).mode).toBeNull();
  });

  it('blocks at the very end (no next page)', () => {
    expect(decideGesture(3, count, false, false).mode).toBeNull();
  });

  it('blocks every gesture while a flip is still animating', () => {
    expect(decideGesture(1, count, false, true).mode).toBeNull();
    expect(decideGesture(2, count, false, true).mode).toBeNull();
  });

  it('handles an odd page count (lone last left page)', () => {
    // count 3 → spreads [0|1] [2]; page 2 is a lone left page.
    expect(decideGesture(2, 3, false, false).mode).toBeNull(); // no page 3 to slide to
    expect(decideGesture(2, 3, true, false)).toEqual({
      mode: 'flip',
      target: 1,
    });
  });
});

describe('slideDx', () => {
  it('follows the finger but never overshoots either page', () => {
    const elW = 360;
    const { restL, restR } = computeLayout(elW, 600, M, MIN_PEEK);
    const span = Math.abs(restR - restL);
    // From the left page, a big leftward drag clamps to exactly the gap.
    const big = slideDx(0, -10000, restL, restR);
    expect(Math.abs(big)).toBeCloseTo(span, 5);
    // A small drag passes through ~1:1.
    expect(slideDx(0, -5, restL, restR)).toBeCloseTo(-5, 5);
    // Wrong-direction drag from the left page is clamped to 0 (can't go past rest).
    expect(slideDx(0, 9999, restL, restR)).toBe(0);
  });
});

describe('stepCrossing', () => {
  it('slides within a spread, flips across one', () => {
    expect(stepCrossing(0, 1)).toBe(false); // even fwd = slide
    expect(stepCrossing(1, 1)).toBe(true); // odd fwd = flip
    expect(stepCrossing(2, -1)).toBe(true); // even back = flip
    expect(stepCrossing(1, -1)).toBe(false); // odd back = slide
  });
});

describe('restFor', () => {
  it('uses restL for even (left) pages and restR for odd (right) pages', () => {
    expect(restFor(0, -10, 99)).toBe(-10);
    expect(restFor(1, -10, 99)).toBe(99);
    expect(restFor(2, -10, 99)).toBe(-10);
  });
});
