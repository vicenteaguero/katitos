export interface RankInput {
  user_id: string;
  score: number;
  created_at: string;
}

export interface LeaderboardEntry {
  userId: string;
  best: number;
  plays: number;
  lastPlayedAt: string;
}

/** Per-player best + play count, ranked by the game's score direction. */
export function aggregateLeaderboard(
  scores: RankInput[],
  order: 'asc' | 'desc'
): LeaderboardEntry[] {
  const byUser = new Map<string, LeaderboardEntry>();
  for (const s of scores) {
    const cur = byUser.get(s.user_id);
    if (!cur) {
      byUser.set(s.user_id, {
        userId: s.user_id,
        best: s.score,
        plays: 1,
        lastPlayedAt: s.created_at,
      });
    } else {
      cur.plays += 1;
      cur.best =
        order === 'desc'
          ? Math.max(cur.best, s.score)
          : Math.min(cur.best, s.score);
      if (s.created_at > cur.lastPlayedAt) cur.lastPlayedAt = s.created_at;
    }
  }
  return [...byUser.values()].sort((a, b) =>
    order === 'desc' ? b.best - a.best : a.best - b.best
  );
}
