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
  /** translateX that puts the LEFT page's left edge at the content-left pad. */
  restL: number;
  /** translateX that puts the RIGHT page's right edge at the content-right. */
  restR: number;
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
  minPeek: number
): BookLayout {
  const byH = Math.floor((availH - 2 * m) * 0.75);
  const pageW = Math.max(200, Math.min(elW - minPeek, byH));
  return {
    pageW,
    trackW: 2 * pageW + 2 * m,
    restL: -m,
    restR: elW - m - 2 * pageW,
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
