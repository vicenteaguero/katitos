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
