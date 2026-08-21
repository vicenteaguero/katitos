import { describe, expect, it } from 'vitest';
import {
  computeLayout,
  coverRest,
  isEndPaper,
  landscapeSpreads,
  leafAfterFlip,
  leafCountFor,
  leafOfPage,
  padLeaves,
  pageOfLeaf,
  placeLeaf,
  restFor,
  settleAfterBoard,
  slideDx,
} from './book-geometry';

/** The book a book of `n` paper pages actually becomes. */
const L = (n: number) => leafCountFor(n);

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

describe('the leaf layout', () => {
  it('always leaves an even number of leaves, so the back cover flips alone', () => {
    for (let n = 0; n <= 20; n++) expect(leafCountFor(n) % 2).toBe(0);
  });

  it('is cover + pages + endpaper + back cover, and nothing else', () => {
    for (let n = 0; n <= 20; n++) {
      expect(leafCountFor(n) - padLeaves(n) - 2).toBe(n);
    }
  });

  it('maps pages to leaves and back, and says so when a leaf is not a page', () => {
    expect(leafOfPage(0)).toBe(1);
    expect(pageOfLeaf(1, 5)).toBe(0);
    expect(pageOfLeaf(5, 5)).toBe(4);
    expect(pageOfLeaf(0, 5)).toBe(-1); // the front cover
    expect(pageOfLeaf(6, 5)).toBe(-1); // the blank endpaper (5 is odd)
    expect(pageOfLeaf(L(5) - 1, 5)).toBe(-1); // the back cover
  });

  it('groups leaves exactly the way StPageFlip does', () => {
    // Transcribed from PageCollection.createSpread(): cover alone, then pairs,
    // then whatever is left over alone. If a react-pageflip upgrade changes
    // this rule, THIS is the test that goes red instead of the whole book.
    const reference = (leafCount: number, showCover: boolean) => {
      const out: number[][] = [];
      let t = 0;
      if (showCover && leafCount > 0) {
        out.push([0]);
        t = 1;
      }
      for (let e = t; e < leafCount; e += 2) {
        if (e < leafCount - 1) out.push([e, e + 1]);
        else out.push([e]);
      }
      return out;
    };
    for (let leafCount = 0; leafCount <= 12; leafCount++) {
      for (const showCover of [true, false]) {
        expect(landscapeSpreads(leafCount, showCover)).toEqual(
          reference(leafCount, showCover)
        );
      }
    }
  });
});

describe('isEndPaper', () => {
  it('finds the blank leaf, and only when there is one', () => {
    // 5 pages → 8 leaves: [cover] 1..5 pages, 6 blank, 7 back.
    const odd = L(5);
    expect(isEndPaper(6, 5, odd)).toBe(true);
    expect(isEndPaper(5, 5, odd)).toBe(false); // the last page
    expect(isEndPaper(7, 5, odd)).toBe(false); // the back board
    expect(isEndPaper(0, 5, odd)).toBe(false); // the front board

    // 6 pages → 8 leaves, no blank at all.
    const even = L(6);
    for (let leaf = 0; leaf < even; leaf++) {
      expect(isEndPaper(leaf, 6, even)).toBe(false);
    }
  });
});

describe('placeLeaf', () => {
  it('opens on a cover that stands alone on the right', () => {
    const p = placeLeaf(0, L(6));
    expect(p.lone).toBe(true);
    expect(p.side).toBe('right');
  });

  it('closes on a back cover that stands alone on the left', () => {
    const leafCount = L(6);
    const p = placeLeaf(leafCount - 1, leafCount);
    expect(p.lone).toBe(true);
    expect(p.side).toBe('left');
  });

  it('puts the paper pages in pairs, odd leaf on the left', () => {
    const leafCount = L(6); // 8 leaves: [0] [1,2] [3,4] [5,6] [7]
    expect(placeLeaf(1, leafCount).side).toBe('left');
    expect(placeLeaf(2, leafCount).side).toBe('right');
    expect(placeLeaf(3, leafCount).side).toBe('left');
    expect(placeLeaf(6, leafCount).side).toBe('right');
    for (const leaf of [1, 2, 3, 4, 5, 6]) {
      expect(placeLeaf(leaf, leafCount).lone).toBe(false);
    }
  });

  it('clamps a leaf that has wandered out of the book', () => {
    const leafCount = L(3);
    expect(placeLeaf(-4, leafCount).leaf).toBe(0);
    expect(placeLeaf(99, leafCount).leaf).toBe(leafCount - 1);
  });
});

describe('leafAfterFlip', () => {
  const leafCount = L(6); // [0] [1,2] [3,4] [5,6] [7]

  it('enters the next spread on its left page', () => {
    expect(leafAfterFlip(3, 2, leafCount)).toBe(3);
  });

  it('enters a spread we are flipping BACK into from its right page', () => {
    expect(leafAfterFlip(1, 3, leafCount)).toBe(2);
  });

  it('lands ON the front cover rather than beside it', () => {
    // The regression this whole function exists for: a lone spread has one
    // leaf, so "enter from the right" would put us on page 1 with the cover
    // already turned — you could never actually see the cover again.
    expect(leafAfterFlip(0, 1, leafCount)).toBe(0);
  });

  it('lands ON the back cover', () => {
    expect(leafAfterFlip(leafCount - 1, leafCount - 2, leafCount)).toBe(
      leafCount - 1
    );
  });
});

describe('slideDx', () => {
  it('follows the finger but never overshoots either page', () => {
    const elW = 360;
    const { restL, restR } = computeLayout(elW, 600, M, MIN_PEEK);
    const span = Math.abs(restR - restL);
    const left = placeLeaf(1, L(4)); // a left-hand paper page
    const big = slideDx(left, -10000, restL, restR);
    expect(Math.abs(big)).toBeCloseTo(span, 5);
    expect(slideDx(left, -5, restL, restR)).toBeCloseTo(-5, 5);
    // Wrong-direction drag from the left page is clamped to 0 (can't pass rest).
    expect(slideDx(left, 9999, restL, restR)).toBe(0);
  });
});

describe('coverRest', () => {
  const M = 10;

  it('centres the shut book, whichever board it is', () => {
    const vw = 360;
    const pageW = 260;
    const leafCount = L(4);

    // Front board: drawn in the right half of the case, whose own padding is
    // `M` — so its left edge on screen is translate + M + pageW.
    const front = placeLeaf(0, leafCount);
    const frontLeft = coverRest(front, pageW, M, vw) + M + pageW;
    expect(frontLeft).toBeCloseTo((vw - pageW) / 2, 6);
    expect(frontLeft + pageW).toBeCloseTo(vw - (vw - pageW) / 2, 6);

    // Back board: drawn in the left half.
    const back = placeLeaf(leafCount - 1, leafCount);
    expect(coverRest(back, pageW, M, vw) + M).toBeCloseTo((vw - pageW) / 2, 6);
  });

  it('leaves nothing of the binding sticking out beside it', () => {
    const vw = 360;
    const pageW = 300;
    const front = placeLeaf(0, L(4));
    const left = coverRest(front, pageW, M, vw) + M + pageW;
    const right = left + pageW;
    expect(Math.abs(left - (vw - right))).toBeLessThan(0.001); // symmetric
  });
});

describe('restFor', () => {
  it('rests left for a left leaf and right for a right one', () => {
    const leafCount = L(4);
    expect(restFor(placeLeaf(1, leafCount), -10, 99)).toBe(-10);
    expect(restFor(placeLeaf(2, leafCount), -10, 99)).toBe(99);
    // The unopened front cover sits on the right of the case…
    expect(restFor(placeLeaf(0, leafCount), -10, 99)).toBe(99);
    // …and the back cover on the left.
    expect(restFor(placeLeaf(leafCount - 1, leafCount), -10, 99)).toBe(-10);
  });
});

describe('opening and closing a board', () => {
  const leafCount = L(6); // [0] [1,2] [3,4] [5,6] [7]

  it('lands on what the front cover was covering, then settles to page one', () => {
    // Off the cover, StPageFlip reports the new spread's first leaf: 1.
    const landed = leafAfterFlip(1, 0, leafCount);
    expect(landed).toBe(2); // page two — the leaf the cover sat on top of
    expect(
      settleAfterBoard(placeLeaf(0, leafCount), placeLeaf(landed, leafCount))
    ).toBe(1); // …and then across to page one
  });

  it('does the same in reverse off the back board', () => {
    const back = leafCount - 1;
    const landed = leafAfterFlip(leafCount - 3, back, leafCount);
    expect(landed).toBe(leafCount - 3); // the leaf the board was lying on
    expect(
      settleAfterBoard(placeLeaf(back, leafCount), placeLeaf(landed, leafCount))
    ).toBe(leafCount - 2);
  });

  it('has nothing to settle when a board is where you land', () => {
    expect(
      settleAfterBoard(placeLeaf(1, leafCount), placeLeaf(0, leafCount))
    ).toBeNull();
  });

  it('leaves an ordinary page turn exactly as it was', () => {
    expect(leafAfterFlip(3, 2, leafCount)).toBe(3); // forward
    expect(leafAfterFlip(1, 3, leafCount)).toBe(2); // back, from the right
    expect(
      settleAfterBoard(placeLeaf(2, leafCount), placeLeaf(3, leafCount))
    ).toBeNull();
  });
});
