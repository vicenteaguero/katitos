import { isNextDay } from '@kernel/lib';

/**
 * Pure, deterministic growth/decay math for Our Tree.
 *
 * THIS MUST MIRROR the plpgsql in supabase/migrations/20260606000006_tree.sql
 * (health + growthForWater). The DB is authoritative for `growth_points`; the
 * UI maps that to stage/height with the curves here. `deriveTree` is used only
 * for (a) live health between renders and (b) unit tests - never to re-derive
 * the displayed stage (which reads tree_state.growth_points directly).
 */

export const HEALTH_HALF_LIFE_DAYS = 1.0;
export const HEALTH_FLOOR = 0.05;
export const STAGE_K = 565;
export const HEIGHT_MAX_M = 12;
export const HEIGHT_K = 0.0019;
export const MS_PER_DAY = 86_400_000;

/** 0.05..1. Halves every day since last water (Gentle); 1 if never watered. */
export function health(lastWateredAt: number | null, now: number): number {
  if (lastWateredAt == null) return 1;
  const days = Math.max(0, (now - lastWateredAt) / MS_PER_DAY);
  return Math.max(HEALTH_FLOOR, Math.pow(0.5, days / HEALTH_HALF_LIFE_DAYS));
}

/** Growth points granted by one valid watering - mildly health-gated. */
export function growthForWater(h: number): number {
  return 1.0 * (0.6 + 0.4 * h);
}

/** Stage 0..100 from accumulated points (asymptotic - 100 is unreachable). */
export function stageFromPoints(points: number): number {
  const s = Math.min(100, 100 * (1 - Math.exp(-points / STAGE_K)));
  return Math.round(s * 100) / 100;
}

/** Height in metres (asymptotic toward 12m - climbs the whole 5-year arc). */
export function heightMeters(points: number): number {
  return HEIGHT_MAX_M * (1 - Math.exp(-HEIGHT_K * points));
}

/** The alternating-waterer guard. */
export function canWater(
  lastWateredBy: string | null,
  by: string
): { ok: boolean; reason?: 'waiting-for-partner' } {
  if (lastWateredBy == null) return { ok: true };
  if (lastWateredBy === by) return { ok: false, reason: 'waiting-for-partner' };
  return { ok: true };
}

export interface Watering {
  watered_by: string;
  watered_at: number; // epoch ms
  couple_day: string; // 'YYYY-MM-DD'
}

export interface TreeView {
  growthPoints: number;
  stage: number;
  height: number;
  health: number;
  waterCount: number;
  lastWateredAt: number | null;
  lastWateredBy: string | null;
  currentStreak: number;
  longestStreak: number;
  nextWaterer: string | null;
  ageDays: number;
}

/** Pure replay of the watering log → the live view at `now`. */
export function deriveTree(
  log: Watering[],
  plantedAt: number,
  now: number,
  members: [string, string]
): TreeView {
  const sorted = [...log].sort((a, b) => a.watered_at - b.watered_at);
  let points = 0;
  let prevAt: number | null = null;
  let lastBy: string | null = null;
  let streak = 0;
  let longest = 0;
  let lastDay: string | null = null;

  for (const w of sorted) {
    points += growthForWater(health(prevAt, w.watered_at));
    if (lastDay == null) streak = 1;
    else if (w.couple_day === lastDay) {
      // same couple-day re-water → streak unchanged
    } else if (isNextDay(lastDay, w.couple_day)) streak += 1;
    else streak = 1;
    longest = Math.max(longest, streak);
    lastDay = w.couple_day;
    prevAt = w.watered_at;
    lastBy = w.watered_by;
  }

  const nextWaterer =
    lastBy == null ? null : (members.find((m) => m !== lastBy) ?? null);

  return {
    growthPoints: points,
    stage: stageFromPoints(points),
    height: heightMeters(points),
    health: health(prevAt, now),
    waterCount: sorted.length,
    lastWateredAt: prevAt,
    lastWateredBy: lastBy,
    currentStreak: streak,
    longestStreak: longest,
    nextWaterer,
    ageDays: Math.max(0, (now - plantedAt) / MS_PER_DAY),
  };
}
