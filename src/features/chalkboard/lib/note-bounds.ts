/**
 * Where a note is allowed to sit on the slate.
 *
 * A note is painted with `translate3d(x, y) rotate(r) scale(s)` about its own
 * centre, so its layout box and the shape you actually see are two different
 * rectangles. The old bounds used the layout width alone, which is only correct
 * at scale 1 and no rotation — every note that had been pinched or tilted got
 * stopped early, and a shrunken one could never reach the right-hand edge at
 * all, because the gap it was refused was the empty air its own transform had
 * already given back.
 *
 * So compute the visual half-extents and constrain those instead.
 */

export interface NoteBox {
  /** The slate. */
  boardW: number;
  boardH: number;
  /** The note's un-transformed layout size. */
  w: number;
  h: number;
  scale: number;
  /** Degrees. */
  rotation: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Half the width and height of the note as it appears, once rotated and scaled.
 *
 * A rotated rectangle's axis-aligned bounding box is wider than the rectangle:
 * both edges project onto both axes, which is why a tilted note needs more room
 * than its own width.
 */
export function visualHalfExtents(
  w: number,
  h: number,
  scale: number,
  rotation: number
): { halfW: number; halfH: number } {
  const rad = (rotation * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  return {
    halfW: (scale * (w * c + h * s)) / 2,
    halfH: (scale * (w * s + h * c)) / 2,
  };
}

/**
 * The travel available to `x`/`y` — the values written to `translate3d`, which
 * are offsets of the *layout* box, not of the visible shape.
 *
 * A note larger than the slate has no legal position at all; rather than
 * refusing to move it, centre its range so it can still be dragged and read.
 */
export function noteBounds({
  boardW,
  boardH,
  w,
  h,
  scale,
  rotation,
}: NoteBox): Bounds {
  const { halfW, halfH } = visualHalfExtents(w, h, scale, rotation);

  // Centre of the note in board coordinates is (x + w/2, y + h/2); the visible
  // shape spans centre ± half-extent. Keeping that span inside the slate is the
  // whole rule.
  const range = (board: number, half: number, layout: number) => {
    const min = half - layout / 2;
    const max = board - half - layout / 2;
    if (min > max) {
      const mid = (min + max) / 2;
      return { min: mid, max: mid };
    }
    return { min, max };
  };

  const x = range(boardW, halfW, w);
  const y = range(boardH, halfH, h);
  return { minX: x.min, maxX: x.max, minY: y.min, maxY: y.max };
}

/** Pull a position back inside its bounds. */
export function clampToBounds(
  x: number,
  y: number,
  b: Bounds
): { x: number; y: number } {
  return {
    x: Math.min(Math.max(x, b.minX), b.maxX),
    y: Math.min(Math.max(y, b.minY), b.maxY),
  };
}
