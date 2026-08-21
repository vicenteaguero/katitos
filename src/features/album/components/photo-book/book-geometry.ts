/**
 * Pure geometry + gesture decisions for the open-book sliding engine.
 *
 * Kept out of the component so the math (page sizing, the two rest offsets, and
 * the slide-vs-flip half split) can be unit-tested directly — it's the part
 * that has bitten us before (off-by-margin peeks, drag bounce). No React here.
 *
 * ── LEAVES, NOT PAGES ──────────────────────────────────────────────────────
 * Since the book grew a front and a back cover, the index everything runs on
 * is a LEAF index, and leaves are not pages:
 *
 *     leaf 0            the front cover, alone on the right
 *     leaf 1 … N        the paper pages       (leafOf(page) = page + 1)
 *     leaf N+1          a blank endpaper, ONLY when N is odd
 *     leaf L-1          the back cover, alone on the left
 *
 * Which half of the case a leaf sits in is therefore no longer "is the index
 * even". It flipped, and it flips again every time a page is added to an
 * odd-length book — so nothing here takes a raw number any more. Everything
 * takes a `LeafPlace`, computed once from the same rule StPageFlip itself uses.
 */

/**
 * A sanity floor, deliberately far below any real screen.
 *
 * It exists so a mis-measurement can't produce a zero-width book — NOT to keep
 * the book "big enough". A floor high enough to fight the height budget is
 * what made the book overflow and clip its own fold on a short screen.
 */
const MIN_PAGE_W = 80;

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
  // The height budget WINS. A hard 200px floor could beat it — on a short
  // screen (a phone turned sideways, which the app now allows) that made the
  // book taller than the space it was given, and the fold was clipped again.
  // A small complete book beats a big clipped one.
  const pageW = Math.max(MIN_PAGE_W, Math.min(elW - minPeek, byH));
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

/* ── Leaves ──────────────────────────────────────────────────────────────── */

/**
 * Blank endpapers needed so the BACK COVER gets a spread to itself.
 *
 * StPageFlip pairs leaves two at a time after the cover, and whatever is left
 * over at the end is drawn alone AND forced to `density: hard`. With an odd
 * number of paper pages that leftover is the last page, not the cover — so the
 * back cover would land beside a photograph and a paper page would flip like a
 * board. One blank leaf keeps the count even and the covers where they belong.
 */
export function padLeaves(pageCount: number): number {
  return pageCount % 2;
}

/** Front cover + pages + endpaper + back cover. Always even, by construction. */
export function leafCountFor(pageCount: number): number {
  return pageCount + 2 + padLeaves(pageCount);
}

/** The leaf a 0-based page index lives on. */
export function leafOfPage(pageIndex: number): number {
  return pageIndex + 1;
}

/**
 * Is this leaf the blank endpaper?
 *
 * It exists ONLY to keep the leaf count even so the back board flips alone —
 * it is not a page and it is not a cover, and nobody should ever be left
 * standing on it wondering why the album has a blank sheet in it. The buttons
 * step over it; you see it in passing, mid-turn, which is what an endpaper is.
 */
export function isEndPaper(leaf: number, pageCount: number, leafCount: number) {
  return leaf > pageCount && leaf < leafCount - 1;
}

/** The page index a leaf shows, or -1 for a cover or the blank endpaper. */
export function pageOfLeaf(leaf: number, pageCount: number): number {
  return leaf >= 1 && leaf <= pageCount ? leaf - 1 : -1;
}

/**
 * How StPageFlip groups leaves into spreads, transcribed from its own
 * `PageCollection.createSpread()`.
 *
 * This is duplicated on purpose rather than inferred: every parity decision on
 * screen has to agree with the library's, and a table test against this
 * function is what will catch a react-pageflip upgrade changing the rule.
 */
export function landscapeSpreads(
  leafCount: number,
  showCover = true
): number[][] {
  const out: number[][] = [];
  let start = 0;
  if (showCover && leafCount > 0) {
    out.push([0]);
    start = 1;
  }
  for (let i = start; i < leafCount; i += 2) {
    if (i < leafCount - 1) out.push([i, i + 1]);
    else out.push([i]);
  }
  return out;
}

export interface LeafPlace {
  /** The leaf itself, clamped into range. */
  leaf: number;
  /** Index into `landscapeSpreads()` — also the `e.data` StPageFlip reports. */
  spread: number;
  /** Which half of the wine case this leaf occupies. */
  side: 'left' | 'right';
  /** True when the leaf has no facing page: the two covers. */
  lone: boolean;
}

/**
 * Where a leaf sits — derived from the spread table, never from `leaf % 2`.
 *
 * The parity is not a constant: adding one page to an odd-length book moves the
 * endpaper and every leaf after it. Deriving means a future padding change
 * degrades into a layout that is merely wrong, instead of one that disagrees
 * with what StPageFlip is actually drawing.
 */
export function placeLeaf(
  leaf: number,
  leafCount: number,
  showCover = true
): LeafPlace {
  const spreads = landscapeSpreads(leafCount, showCover);
  const clamped = Math.min(Math.max(leaf, 0), Math.max(0, leafCount - 1));
  for (let i = 0; i < spreads.length; i++) {
    const s = spreads[i];
    if (s[0] !== clamped && s[1] !== clamped) continue;
    const lone = s.length === 1;
    // A lone spread is drawn on the RIGHT (an unopened cover) unless it is the
    // very last leaf, which is the back cover and closes from the LEFT.
    const side: 'left' | 'right' = lone
      ? clamped === leafCount - 1 && leafCount > 1
        ? 'left'
        : 'right'
      : clamped === s[0]
        ? 'left'
        : 'right';
    return { leaf: clamped, spread: i, side, lone };
  }
  return { leaf: clamped, spread: 0, side: 'right', lone: true };
}

/**
 * The leaf we land on after StPageFlip finishes a flip.
 *
 * `onFlip` hands us the FIRST LEAF of the new spread — not a spread number,
 * whatever the old comment here said. Going forwards that first leaf is where
 * we want to be; going backwards we are re-entering a spread from its right
 * page, which is the sliding-window continuity the whole engine is built on.
 * A lone spread has only one leaf to be on either way.
 */
export function leafAfterFlip(
  data: number,
  prevFocused: number,
  leafCount: number,
  showCover = true
): number {
  const dest = placeLeaf(data, leafCount, showCover);
  if (dest.lone) return dest.leaf;

  // Coming off a BOARD, you land on whatever was underneath it — which is the
  // leaf on the board's own side. Open the front cover and page two is what
  // the cover was covering; the book then slides across to page one. Landing
  // straight on page one instead meant the case had to jump the width of a
  // page the instant the turn finished, which is what read as broken.
  const from = placeLeaf(prevFocused, leafCount, showCover);
  if (from.lone) return from.side === 'right' ? data + 1 : data;

  return data < prevFocused ? data + 1 : data;
}

/**
 * After landing from a board, the leaf we then slide across to.
 *
 * Revealed page → the one you actually read. Forward off the front cover that
 * is the left-hand page; backward off the back board it is the right-hand one.
 * `null` when there is nothing to settle to.
 */
export function settleAfterBoard(
  from: LeafPlace,
  landed: LeafPlace
): number | null {
  if (!from.lone || landed.lone) return null;
  return from.side === 'right' ? landed.leaf - 1 : landed.leaf + 1;
}

/**
 * Where a CLOSED book rests: centred, and only one board wide.
 *
 * A cover has no facing page, but the case behind it is still two pages wide —
 * so the binding stuck out past the board on one side and ran off the screen
 * on the other, and the whole thing read as a book lying on top of another
 * book. A shut book is one board; it sits in the middle of the screen; you
 * open it and THEN it becomes a spread that slides.
 */
export function coverRest(
  place: LeafPlace,
  pageW: number,
  m: number,
  vw: number
): number {
  // The BOARD is the whole book when it is shut — there is no binding behind
  // it to leave room for, so this centres the leaf itself. Leaving the case's
  // margin visible around it was the second half of the "book on top of a
  // book" look: two rounded rectangles, one inside the other, both wine.
  const centred = (vw - pageW) / 2;
  // The front board is drawn in the RIGHT half of the case, so the track comes
  // back by a page and the case's own padding for that half to land centred.
  return place.side === 'right' ? centred - m - pageW : centred - m;
}

/** The rest offset for the leaf currently focused. */
export function restFor(
  place: LeafPlace,
  restL: number,
  restR: number
): number {
  return place.side === 'left' ? restL : restR;
}

/**
 * The finger-follow translate for a slide: pan between the current rest and the
 * facing page's rest, clamped so it never overshoots either page.
 */
export function slideDx(
  place: LeafPlace,
  mx: number,
  restL: number,
  restR: number
): number {
  const restCur = place.side === 'left' ? restL : restR;
  const restTgt = place.side === 'left' ? restR : restL;
  const lo = Math.min(restCur, restTgt);
  const hi = Math.max(restCur, restTgt);
  return Math.max(lo, Math.min(hi, restCur + mx)) - restCur;
}

/**
 * There is deliberately no `stepCrossing` here any more.
 *
 * "Does this direction cross a spread boundary" stopped being answerable from
 * a direction alone the moment the buttons had to step OVER the blank
 * endpaper: from the last page, one press forward lands two leaves away. The
 * caller compares `placeLeaf(target).spread` with the current one instead,
 * which is the same question asked of the destination we actually want.
 */

/**
 * There is deliberately no `decideGesture` here any more.
 *
 * One used to exist, complete with six passing tests — and nothing imported
 * it. The real split is not a function at all: `.pb-slide-zone` is a
 * transparent overlay covering the SPINE half of the focused leaf, so the DOM
 * decides who owns a touch before any of our code runs, and StPageFlip gets
 * the outer half untouched. Green tests over a code path that never executes
 * are worse than no tests, because they read like coverage.
 *
 * `stepCrossing` is the button-press equivalent and IS used; `placeLeaf` is
 * what both of them are really asking.
 */
