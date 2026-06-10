/**
 * Pure, deterministic tree geometry. Builds an IMMUTABLE max-depth branch
 * skeleton from `seed` (seeded mulberry32 PRNG), with a hard segment budget so
 * the SVG and its animations stay cheap. Node identity is fixed for the tree's
 * life: each segment has a stable `id` and a `revealAt` stage (0..100). The
 * drawn length of a segment is `clamp((stage - revealAt)/REVEAL_SPAN, 0, 1)`,
 * so the tree grows continuously across all 100 stages and milestones pin to an
 * immutable `slot` (segment id) that never moves.
 *
 * Health scales leaf count + droop. Milestones attach a flower/fruit to the
 * segment whose deterministic id matches the milestone slot.
 *
 * This module is PURE (no React, no DOM) so it memoizes cleanly.
 */

export type SegmentKind = 'trunk' | 'branch' | 'leaf' | 'flower' | 'fruit';

export interface Segment {
  id: number;
  kind: SegmentKind;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  depth: number;
  /** Stage 0..100 at which this segment begins to appear (monotone by depth). */
  revealAt: number;
  /** Milestone anchor id (a segment's stable slot); present on every segment. */
  slot: number;
  milestoneId?: string;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Geometry {
  segments: Segment[];
  bounds: Bounds;
}

export interface MilestoneAnchor {
  id: string;
  slot: number;
  kind: 'flower' | 'fruit';
}

export interface BuildGeometryArgs {
  seed: number;
  /** Continuous stage 0..100 (from tree_state.growth_points). */
  stage: number;
  /** Live health 0.05..1 — drives leaf density + droop. */
  health: number;
  milestones?: MilestoneAnchor[];
}

const MAX_DEPTH = 9;
const SEGMENT_BUDGET = 350;
export const REVEAL_SPAN = 14;
const TRUNK_LEN = 90;
const TRUNK_WIDTH = 9;

/** Seeded PRNG — mulberry32. Deterministic 0..1 stream from a 32-bit seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** clamp helper */
function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Build the immutable skeleton. Recurses to MAX_DEPTH but prunes children via
 * the PRNG as the running segment count nears the budget (deeper = sparser),
 * keeping the total around SEGMENT_BUDGET while preserving determinism.
 */
function buildSkeleton(seed: number): { segments: Segment[]; bounds: Bounds } {
  const rnd = mulberry32(seed);
  const segments: Segment[] = [];
  const bounds: Bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let nextId = 0;

  const track = (x: number, y: number) => {
    if (x < bounds.minX) bounds.minX = x;
    if (y < bounds.minY) bounds.minY = y;
    if (x > bounds.maxX) bounds.maxX = x;
    if (y > bounds.maxY) bounds.maxY = y;
  };

  // Recurse. `order` 0..1 within a depth controls reveal ordering (outer later).
  function grow(
    x: number,
    y: number,
    angle: number,
    length: number,
    width: number,
    depth: number,
    order: number
  ): void {
    if (depth > MAX_DEPTH) return;

    // Budget-aware pruning: as we fill up, deeper branches drop out probabilistically.
    if (segments.length >= SEGMENT_BUDGET) return;
    const pressure = segments.length / SEGMENT_BUDGET; // 0..1
    if (depth >= 3 && rnd() < pressure * (depth / MAX_DEPTH)) return;

    const x2 = x + Math.sin(angle) * length;
    const y2 = y - Math.cos(angle) * length;
    track(x, y);
    track(x2, y2);

    // revealAt grows monotonically with depth + order: trunk≈0, twigs≈100.
    const revealAt = clamp((depth / MAX_DEPTH) * 88 + order * 12, 0, 100);
    const id = nextId++;
    const kind: SegmentKind =
      depth === 0 ? 'trunk' : depth >= MAX_DEPTH - 1 ? 'leaf' : 'branch';

    segments.push({
      id,
      kind,
      x1: x,
      y1: y,
      x2,
      y2,
      width,
      depth,
      revealAt,
      slot: id,
    });

    if (depth >= MAX_DEPTH) return;

    // 2–3 children; angle spread widens with depth, length + width shrink.
    const childCount = depth === 0 ? 2 : rnd() < 0.45 ? 3 : 2;
    const spread = 0.35 + depth * 0.06;
    for (let i = 0; i < childCount; i++) {
      const frac = i / (childCount - 1);
      const jitter = (rnd() - 0.5) * 0.4;
      const childAngle = angle + (frac - 0.5) * 2 * spread + jitter;
      const childLen = length * (0.72 + rnd() * 0.12);
      const childWidth = Math.max(0.6, width * 0.68);
      const childOrder = clamp(order + frac * 0.12 + 0.04, 0, 1);
      grow(x2, y2, childAngle, childLen, childWidth, depth + 1, childOrder);
    }
  }

  grow(0, 0, 0, TRUNK_LEN, TRUNK_WIDTH, 0, 0);
  return { segments, bounds };
}

// Skeletons are immutable for a given seed; cache them so re-renders (stage /
// health changes) never rebuild the recursion.
const skeletonCache = new Map<
  number,
  { segments: Segment[]; bounds: Bounds }
>();

function skeletonFor(seed: number): { segments: Segment[]; bounds: Bounds } {
  let cached = skeletonCache.get(seed);
  if (!cached) {
    cached = buildSkeleton(seed);
    skeletonCache.set(seed, cached);
  }
  return cached;
}

/**
 * Build the renderable geometry for a given (seed, stage, health, milestones).
 * Returns a fresh segment array each call but is otherwise pure: leaves are
 * filtered by health, milestone ornaments attach to their anchor segments.
 */
export function buildGeometry({
  seed,
  stage,
  health,
  milestones = [],
}: BuildGeometryArgs): Geometry {
  const { segments: skeleton, bounds } = skeletonFor(seed);
  const out: Segment[] = [];

  // Health scales how many leaf twigs we keep + a slight droop.
  const droop = (1 - health) * 0.25;
  const milestoneBySlot = new Map<number, MilestoneAnchor>();
  for (const m of milestones) milestoneBySlot.set(m.slot, m);

  for (const seg of skeleton) {
    // Hide segments not yet revealed at the current stage.
    if (seg.revealAt > stage) continue;

    let s = seg;
    if (seg.kind === 'leaf') {
      // Health thins leaves: keep a deterministic fraction.
      const keep = clamp(0.35 + health * 0.65, 0, 1);
      // Deterministic per-id keep decision.
      const r = ((seg.id * 2654435761) >>> 0) / 4294967296;
      if (r > keep) continue;
      if (droop > 0) {
        const dy = (seg.y2 - seg.y1) * droop;
        s = { ...seg, y2: seg.y2 + Math.abs(dy) };
      }
    }

    const anchor = milestoneBySlot.get(seg.slot);
    if (anchor) {
      out.push({
        ...s,
        kind: anchor.kind,
        milestoneId: anchor.id,
      });
    } else {
      out.push(s);
    }
  }

  return { segments: out, bounds };
}

/** Bucket a 0..1 value to stabilise memo keys (health changes are coarse). */
export function bucket(v: number, size: number): number {
  return Math.round(v / size) * size;
}
