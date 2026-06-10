import { isNextDay } from '@kernel/lib';

/**
 * Pure scoring + love-map math for Know-Me. Derived ONLY from revealed answers
 * (days where both submitted). No game_scores; the answers are the source.
 */

export interface DayRecord {
  coupleDay: string; // 'YYYY-MM-DD'
  category: string;
  bothSubmitted: boolean;
  selfOwn: string | null; // my truth
  selfGuess: string | null; // my guess of partner
  partnerOwn: string | null; // partner's truth
  partnerGuess: string | null; // partner's guess of me
}

export interface DirectionStats {
  correct: number;
  total: number;
  pct: number;
}

export interface LoveMap {
  selfKnowsPartner: DirectionStats; // how well I guess them
  partnerKnowsSelf: DirectionStats; // how well they guess me
  currentStreak: number;
  longestStreak: number;
  daysPlayed: number;
  categoryCoverage: Record<string, number>;
}

/** A point when MY guess of partner equals partner's TRUTH. Symmetric. */
export function scoreDay(d: DayRecord): {
  selfRight: boolean;
  partnerRight: boolean;
} {
  return {
    selfRight:
      d.bothSubmitted && d.selfGuess != null && d.selfGuess === d.partnerOwn,
    partnerRight:
      d.bothSubmitted && d.partnerGuess != null && d.partnerGuess === d.selfOwn,
  };
}

/**
 * Streak = consecutive couple-days where BOTH answered. A one-sided day is
 * neutral (doesn't extend), but it does interrupt adjacency. `current` only
 * counts if the most recent record is itself a completed day.
 */
export function computeStreaks(records: DayRecord[]): {
  current: number;
  longest: number;
} {
  const sorted = [...records].sort((a, b) =>
    a.coupleDay.localeCompare(b.coupleDay)
  );
  const bothDays = sorted
    .filter((r) => r.bothSubmitted)
    .map((r) => r.coupleDay);
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of bothDays) {
    run = prev != null && isNextDay(prev, day) ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = day;
  }
  const latestRecordDay = sorted.length
    ? sorted[sorted.length - 1].coupleDay
    : null;
  const current = prev != null && prev === latestRecordDay ? run : 0;
  return { current, longest };
}

const direction = (correct: number, total: number): DirectionStats => ({
  correct,
  total,
  pct: total === 0 ? 0 : Math.round((correct / total) * 100),
});

export function buildLoveMap(records: DayRecord[]): LoveMap {
  let sc = 0;
  let st = 0;
  let pc = 0;
  let pt = 0;
  const cov: Record<string, number> = {};
  for (const r of records) {
    if (!r.bothSubmitted) continue;
    const { selfRight, partnerRight } = scoreDay(r);
    st += 1;
    pt += 1;
    if (selfRight) sc += 1;
    if (partnerRight) pc += 1;
    cov[r.category] = (cov[r.category] ?? 0) + 1;
  }
  const { current, longest } = computeStreaks(records);
  return {
    selfKnowsPartner: direction(sc, st),
    partnerKnowsSelf: direction(pc, pt),
    currentStreak: current,
    longestStreak: longest,
    daysPlayed: st,
    categoryCoverage: cov,
  };
}
