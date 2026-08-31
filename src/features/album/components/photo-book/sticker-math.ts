/**
 * Pure maths for the stickers on a page: what order they stack in, and what a
 * corner-handle drag means.
 *
 * Kept out of the components for the same reason `book-geometry.ts` is — this
 * is the part that silently goes wrong (a sticker that will not come to the
 * front, a rotation that spins the wrong way) and the part worth testing.
 */

/** The minimum a placement needs for ordering. */
export interface Stackable {
  id: string;
  z: number;
  created_at: string;
}

/**
 * Back to front.
 *
 * `z` alone is not enough: two stickers can share a depth (everything starts at
 * 0, and the backfill seeded from slot), so age breaks the tie and the id
 * breaks that — otherwise the order flickers between renders and React
 * re-creates rows that never changed.
 */
export function orderStickers<T extends Stackable>(list: readonly T[]): T[] {
  return [...list].sort(
    (a, b) =>
      a.z - b.z ||
      a.created_at.localeCompare(b.created_at) ||
      a.id.localeCompare(b.id)
  );
}

/** Depth that puts a sticker in front of everything currently on the page. */
export function nextZFront(zs: readonly number[]): number {
  return zs.length ? Math.max(...zs) + 1 : 0;
}

/** Depth that tucks a sticker behind everything else. */
export function nextZBack(zs: readonly number[]): number {
  return zs.length ? Math.min(...zs) - 1 : 0;
}

/**
 * Depths only ever grow apart — front, back, front, back — so after enough
 * fiddling the range drifts. Nothing breaks until it does, so we only tidy up
 * when it gets genuinely silly.
 */
const Z_LIMIT = 10_000;

export function needsNormalize(zs: readonly number[]): boolean {
  return zs.some((z) => Math.abs(z) > Z_LIMIT);
}

/**
 * Move ONE sticker a single step through the stack.
 *
 * Front and back in one jump is a blunt instrument: with ten things on a page
 * the only arrangements you can reach are "this one on top" and "this one at
 * the bottom", and getting something to sit between two others is impossible.
 * A step at a time can reach any order at all, and it is undoable by pressing
 * the other button once.
 *
 * Returns ONLY the rows whose depth actually changed — an empty list when the
 * sticker is already at that end. Depths come back normalised to 0..n-1, so
 * the sparse comparator gets tidied up for free every time.
 */
export function stepOrder<T extends Stackable>(
  list: readonly T[],
  id: string,
  dir: 1 | -1
): { id: string; z: number }[] {
  const ordered = orderStickers(list);
  const at = ordered.findIndex((s) => s.id === id);
  const to = at + dir;
  if (at < 0 || to < 0 || to >= ordered.length) return [];
  const swapped = [...ordered];
  [swapped[at], swapped[to]] = [swapped[to], swapped[at]];
  return swapped
    .map((s, i) => ({ id: s.id, z: i }))
    .filter((row, i) => ordered[i].id !== row.id || ordered[i].z !== row.z);
}

/** Re-number a page 0..n-1 in its current visual order. Nothing moves. */
export function normalizeZ<T extends Stackable>(
  list: readonly T[]
): { id: string; z: number }[] {
  return orderStickers(list).map((s, i) => ({ id: s.id, z: i }));
}

export interface Point {
  x: number;
  y: number;
}

/** Where a handle drag started: the sticker's state plus the grab point. */
export interface HandleBase {
  scale: number;
  rotation: number;
  /** Distance from the sticker's centre to the pointer when the drag began. */
  radius: number;
  /** Angle (degrees) from centre to pointer when the drag began. */
  angle: number;
}

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 3;
/** Degrees of slack for snapping to a straight angle. */
const SNAP = 4;

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

/** Degrees from `centre` to `p`, measured like CSS rotate (clockwise from up). */
export function angleOf(centre: Point, p: Point): number {
  return (Math.atan2(p.y - centre.y, p.x - centre.x) * 180) / Math.PI;
}

export function distanceOf(centre: Point, p: Point): number {
  return Math.hypot(p.x - centre.x, p.y - centre.y);
}

/** Snap to the nearest quarter turn when we're already within a few degrees. */
export function snapAngle(deg: number): number {
  const norm = (((deg % 360) + 540) % 360) - 180; // → (-180, 180]
  for (const target of [-180, -90, 0, 90, 180]) {
    if (Math.abs(norm - target) <= SNAP) return target;
  }
  return norm;
}

/**
 * One finger on the corner handle: away from the centre grows it, around the
 * centre turns it.
 *
 * This exists because pinch cannot work here — the page-flip owns two-finger
 * gestures, and a sticker filling half a phone screen leaves nowhere to pinch
 * anyway. It's the Keynote handle, and it needs one thumb.
 */
export function handleTransform(
  centre: Point,
  pointer: Point,
  base: HandleBase
): { scale: number; rotation: number } {
  const radius = distanceOf(centre, pointer);
  // A grab that starts on top of the centre has no direction to speak of;
  // dividing by it would send the sticker to infinity.
  const ratio = base.radius > 1 ? radius / base.radius : 1;
  return {
    scale: clamp(base.scale * ratio, MIN_SCALE, MAX_SCALE),
    rotation: snapAngle(
      base.rotation + (angleOf(centre, pointer) - base.angle)
    ),
  };
}

/**
 * Where the next sticker should land.
 *
 * Everything was dropped at dead centre, so putting four photos on a page made
 * a perfect stack and looked exactly like three of them had failed to appear.
 * They come down beside each other instead, spiralling gently outwards, and
 * each one is tilted a little — a page you then tidy up, rather than a pile.
 *
 * Deterministic in the number already on the page: both phones computing it at
 * once agree, and there is nothing random to make a test flaky.
 */
const RING: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0.17, -0.11],
  [-0.17, 0.11],
  [0.16, 0.15],
  [-0.16, -0.15],
  [0, 0.21],
  [0, -0.21],
];

/** Degrees of tilt, cycling so neighbours lean opposite ways. */
const TILTS = [-3, 2.5, -1.5, 3.5, -2.5, 1.5] as const;

export function dropSpot(placedCount: number): {
  x: number;
  y: number;
  rotation: number;
} {
  const n = Math.max(0, Math.floor(placedCount));
  const [dx, dy] = RING[n % RING.length];
  // Each full lap pushes a little further out, so a busy page keeps spreading
  // instead of landing back on the first ring.
  const lap = Math.floor(n / RING.length);
  const drift = 1 + lap * 0.28;
  return {
    x: clamp01(0.5 + dx * drift),
    y: clamp01(0.5 + dy * drift),
    rotation: TILTS[n % TILTS.length],
  };
}

/** Never against the very edge, where a sticker is half off the paper. */
function clamp01(v: number): number {
  return Math.min(0.82, Math.max(0.18, v));
}

/** A sticker at scale 1, as a fraction of the page width. */
export const BASE_W = 0.42;

/** How wide the card around a photo is. */
export type MatWidth = 'thin' | 'medium' | 'wide';

/** How a photo is mounted. Kept in step with the DB's `frame` check. */
export type MountFrame =
  | 'none'
  | 'plain'
  | 'white'
  | 'polaroid'
  | 'gilt'
  | 'tape'
  | 'shadow';

/** The mat band, as a fraction of the sticker's own WIDTH. */
const MAT: Record<MatWidth, number> = {
  thin: 0.022,
  medium: 0.045,
  wide: 0.09,
};

/**
 * How much of that band each mount actually wants.
 *
 * A gilt rule is not a slab of gold, tape goes on the picture rather than on a
 * card, and a lifted print has only the thin white edge a print has.
 */
const MOUNT_K: Record<MountFrame, number> = {
  none: 0,
  plain: 1,
  white: 1,
  polaroid: 1,
  gilt: 0.34,
  tape: 0,
  shadow: 0.28,
};

/**
 * Instant film has its own proportions and ignores the thickness control.
 *
 * Taken from the app's own `PolaroidPlate` (`kernel/ui/polaroid-plate.tsx`),
 * which is the same object the daily photo and the flowers show — at the size
 * a sticker actually is that is its `sm` variant: `p-1.5 pb-2.5` on a ~120px
 * card, so a 5% edge and an 8% chin, with the caption's own margin making up
 * the rest. The album was guessing 6% and 20% and came out as a different
 * object standing next to it.
 */
export const FILM_EDGE = 0.05;
export const FILM_CHIN = 0.08;
/**
 * The mount's band, as a fraction of the sticker's width.
 *
 * ONE number, computed here and handed to CSS as `--pb-mat` and to the printed
 * page as a fraction — so the card cannot come out one size on the screen and
 * another on paper. A fraction, not pixels, because the old fixed 5px band
 * meant a sticker at scale 0.3 was almost entirely card and one at scale 3 had
 * a hairline: the mount has to grow with the photograph.
 */
export function matFraction(
  frame: MountFrame | string | null | undefined,
  width: MatWidth | string | null | undefined
): number {
  if (frame === 'polaroid') return FILM_EDGE;
  const band = MAT[(width as MatWidth) ?? 'medium'] ?? MAT.medium;
  const k = MOUNT_K[(frame as MountFrame) ?? 'white'] ?? 1;
  return band * k;
}

/** The cut of the window a photo shows through. */
export type StickerShape =
  | 'natural'
  | 'square'
  | 'rounded'
  | 'circle'
  | 'arch'
  | 'heart'
  | 'torn';

/**
 * The shape of the FRAME, which is not always the shape of the photo.
 *
 * `natural` and `rounded` follow the photograph. Everything else imposes its
 * own proportions and the picture is cropped into them — that is the whole
 * point of choosing a circle.
 */
export function shapeRatio(
  shape: StickerShape | null | undefined,
  width?: number | null,
  height?: number | null
): number {
  switch (shape) {
    case 'square':
    case 'circle':
    case 'heart':
    case 'torn':
      return 1;
    case 'arch':
      return 3 / 4;
    default:
      return width && height ? width / height : 1;
  }
}

/**
 * How wide a frame of a given aspect should sit on the page.
 *
 * Every sticker used to be 42% of the page WIDE whatever shape it was, so a
 * portrait photo came out towering over the landscape one beside it — same
 * width, nearly twice the height, and the page looked lopsided. Matching the
 * AREA instead makes the two read as a pair: a wide frame is wider and shorter,
 * a tall one narrower and taller, and both take up the same amount of paper.
 */
export function frameWidth(ratio: number): number {
  // sqrt, because area is width × height and height is width ÷ ratio.
  const w = BASE_W * Math.sqrt(ratio);
  return Math.min(0.72, Math.max(0.22, w));
}

/**
 * How wide a photo should sit on the page, in its own natural shape.
 *
 * Kept as it was — the PDF re-exports this name — and now expressed in terms
 * of the two pieces above, so a shaped sticker and a plain one are sized by
 * one rule rather than two that drift.
 */
export function stickerWidth(
  width?: number | null,
  height?: number | null
): number {
  return frameWidth(shapeRatio('natural', width, height));
}

/** The width of a sticker once its shape has had its say. */
export function shapedWidth(
  shape: StickerShape | null | undefined,
  width?: number | null,
  height?: number | null
): number {
  return frameWidth(shapeRatio(shape, width, height));
}
