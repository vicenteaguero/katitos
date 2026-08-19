/**
 * Where everything goes on a printed page.
 *
 * Pure, and tested, because two of these conversions are the kind that go
 * wrong silently and are only noticed when the finished book is upside down:
 *   • PDF measures from the BOTTOM-left; our `y` is a fraction from the TOP.
 *   • CSS `rotate()` turns clockwise; PDF's matrix turns counter-clockwise.
 */

/** 3:4 portrait, matching the on-screen page (`pageH = pageW * 4/3`). */
export const PAGE_W = 594;
export const PAGE_H = 792;

/** A photo sticker's width as a fraction of the page, at scale 1. */
export const BASE_W = 0.42;

export interface Placed {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  /** Natural pixel size, when we know it — otherwise it is drawn square. */
  width?: number | null;
  height?: number | null;
}

export interface Box {
  /** Centre of the sticker, in PDF points from the bottom-left. */
  cx: number;
  cy: number;
  w: number;
  h: number;
  /** Degrees, counter-clockwise — what a PDF matrix wants. */
  rotation: number;
}

export function layoutSticker(p: Placed, pageW = PAGE_W, pageH = PAGE_H): Box {
  const w = BASE_W * (p.scale || 1) * pageW;
  const ratio = p.width && p.height && p.width > 0 ? p.height / p.width : 1;
  return {
    cx: p.x * pageW,
    // The flip. Without it every album prints mirrored top-to-bottom.
    cy: (1 - p.y) * pageH,
    w,
    h: w * ratio,
    // The other flip.
    rotation: -(p.rotation || 0),
  };
}

/**
 * The 6-number transform matrix that places a unit square as `box`.
 *
 * PDF draws an image into the unit square and then applies `cm`, so this is
 * scale → rotate → move, in that order.
 */
export function stickerMatrix(
  box: Box
): [number, number, number, number, number, number] {
  const rad = (box.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [
    box.w * cos,
    box.w * sin,
    -box.h * sin,
    box.h * cos,
    box.cx - (box.w * cos - box.h * sin) / 2,
    box.cy - (box.w * sin + box.h * cos) / 2,
  ];
}

/**
 * A point offset from a box's centre, measured along the box's OWN axes.
 *
 * The photo window sits above the middle of a polaroid plate, and the caption
 * below it — but once the sticker is tilted, "above" is no longer straight up
 * the page. Adding the offset in page space slid the photograph off its frame
 * for every sticker that wasn't perfectly level, which is most of them.
 */
export function offsetInFrame(
  box: Pick<Box, 'cx' | 'cy' | 'rotation'>,
  dx: number,
  dy: number
): { cx: number; cy: number } {
  const rad = (box.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    cx: box.cx + dx * cos - dy * sin,
    cy: box.cy + dx * sin + dy * cos,
  };
}

/** Instant-film proportions: a square window with a deeper chin beneath it. */
export interface FilmLayout {
  /** The white plate. */
  plate: { w: number; h: number };
  /** The photo window, offset from the plate's bottom-left. */
  window: { x: number; y: number; size: number };
  /** Where the caption baseline sits inside the chin. */
  captionY: number;
}

const FILM_EDGE = 0.06; // side/top border, as a fraction of the plate width
const FILM_CHIN = 0.2; // bottom border — deliberately deeper than the rest

export function filmLayout(width: number): FilmLayout {
  const edge = width * FILM_EDGE;
  const size = width - edge * 2;
  const h = size + edge + width * FILM_CHIN;
  return {
    plate: { w: width, h },
    window: { x: edge, y: width * FILM_CHIN, size },
    captionY: width * FILM_CHIN * 0.38,
  };
}
