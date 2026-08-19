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
  it('aligns the cover to the left/right padding (page inset by the cover)', () => {
    const elW = 360;
    const { pageW, restL, restR } = computeLayout(elW, 600, M, MIN_PEEK);
    // Focus-left: the cover's left edge sits at content-left (0).
    expect(restL).toBe(0);
    // Focus-right: the cover's right edge (trackW + restR) sits at elW.
    expect(2 * pageW + 2 * M + restR).toBe(elW);
  });

  it('always keeps at least MIN_PEEK of the facing page visible', () => {
    const elW = 360;
    const { pageW } = computeLayout(elW, 100000, M, MIN_PEEK); // height not limiting
    expect(pageW).toBeLessThanOrEqual(elW - MIN_PEEK);
  });

  it('takes the curl padding out of the height budget, not out of thin air', () => {
    const availH = 600;
    const plain = computeLayout(1000, availH, M, MIN_PEEK);
    const padded = computeLayout(1000, availH, M, MIN_PEEK, 16);
    // Height-limited here, so reserving room for the fold makes the page
    // smaller rather than making the book overflow the space it was given.
    expect(padded.pageW).toBeLessThan(plain.pageW);
  });

  it('reports a viewport tall enough for the page, the cover and both halos', () => {
    const curlPad = 16;
    const { pageW, viewportH } = computeLayout(360, 600, M, MIN_PEEK, curlPad);
    expect(viewportH).toBe(Math.round(pageW * (4 / 3)) + 2 * M + 2 * curlPad);
  });

  it('still fits the space it was handed once the halo is included', () => {
    const availH = 600;
    const { viewportH } = computeLayout(360, availH, M, MIN_PEEK, 16);
    expect(viewportH).toBeLessThanOrEqual(availH);
  });

  it('uses the height it is given, right up to the edge', () => {
    // A real boundary rather than a case with slack in it: this must come out
    // at exactly the budget, so a change that overshoots by a pixel fails.
    expect(computeLayout(1000, 600, M, MIN_PEEK, 16).viewportH).toBe(600);
  });

  it('never overflows a short screen — a phone turned sideways', () => {
    // The old 200px floor beat the height budget here and the book was clipped.
    for (const availH of [200, 260, 300, 340]) {
      const { viewportH } = computeLayout(640, availH, M, MIN_PEEK, 16);
      expect(viewportH).toBeLessThanOrEqual(availH);
    }
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
