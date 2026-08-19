/**
 * Pure geometry + gesture decisions for the open-book sliding engine.
 *
 * Kept out of the component so the math (page sizing, the two rest offsets, and
 * the slide-vs-flip half split) can be unit-tested directly — it's the part
 * that has bitten us before (off-by-margin peeks, drag bounce). No React here.
 */

export interface BookLayout {
  pageW: number;
  trackW: number;
  /**
   * Height the viewport must reserve: the page, the cover margin on both
   * sides, AND the halo the curling leaf paints outside the paper. Without the
   * last term the fold was sliced flat against the top and bottom edges.
   */
  viewportH: number;
  /** translateX that puts the LEFT page's left edge at the content-left pad. */
  restL: number;
  /** translateX that puts the RIGHT page's right edge at the content-right. */
  restR: number;
  /** The viewport (padded content) width — for splitting the drag halves. */
  vw: number;
}

/**
 * Size one page + the two rest offsets from the padded content width `elW` and
 * the available height. The focused page aligns to a side padding; the facing
 * page always peeks at least `minPeek` on the other side.
 */
export function computeLayout(
  elW: number,
  availH: number,
  m: number,
  minPeek: number,
  curlPad = 0
): BookLayout {
  // The curl needs room ABOVE and BELOW the paper, so it comes out of the
  // height budget before the page is sized — not bolted on afterwards, which
  // is how the book ended up taller than the space it was given.
  const byH = Math.floor((availH - 2 * m - 2 * curlPad) * 0.75);
  const pageW = Math.max(200, Math.min(elW - minPeek, byH));
  const trackW = 2 * pageW + 2 * m;
  return {
    pageW,
    trackW,
    viewportH: Math.round(pageW * (4 / 3)) + 2 * m + 2 * curlPad,
    // The wine COVER (frame) sits at the content padding on the focused side;
    // the page is inset by the cover margin `m`. The other side overflows.
    restL: 0,
    restR: elW - trackW,
    vw: elW,
  };
}

export type GestureMode = 'slide' | 'flip' | null;

export interface GestureDecision {
  mode: GestureMode;
  target: number;
}

/**
 * Classify a touch by the focused page's parity and which half it began in,
 * locking it for the whole gesture (so slide and flip never mix → no bounce).
 *   Left page (even)  → [ flipPrev | slide ]
 *   Right page (odd)  → [ slide | flipNext ]
 * Returns `mode: null` at the book's ends or while a flip is still animating.
 */
export function decideGesture(
  focused: number,
  count: number,
  leftHalf: boolean,
  busy: boolean
): GestureDecision {
  const target = focused + (leftHalf ? -1 : 1);
  const even = focused % 2 === 0;
  const crossing = even ? leftHalf : !leftHalf;
  if (busy || target < 0 || target > count - 1) return { mode: null, target };
  return { mode: crossing ? 'flip' : 'slide', target };
}

/** The rest offset for the currently focused page. */
export function restFor(focused: number, restL: number, restR: number): number {
  return focused % 2 === 0 ? restL : restR;
}

/**
 * The finger-follow translate for a slide: pan between the current rest and the
 * facing page's rest, clamped so it never overshoots either page.
 */
export function slideDx(
  focused: number,
  mx: number,
  restL: number,
  restR: number
): number {
  const even = focused % 2 === 0;
  const restCur = even ? restL : restR;
  const restTgt = even ? restR : restL;
  const lo = Math.min(restCur, restTgt);
  const hi = Math.max(restCur, restTgt);
  return Math.max(lo, Math.min(hi, restCur + mx)) - restCur;
}

/** A button step: does direction `dir` cross a spread boundary (→ flip)? */
export function stepCrossing(focused: number, dir: 1 | -1): boolean {
  const even = focused % 2 === 0;
  return dir > 0 ? !even : even;
}
