import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import type { Tables } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { aggregateLeaderboard, type LeaderboardEntry } from './rank';

export type GameScore = Tables<'game_scores'>;
export type { LeaderboardEntry };

/** Per-player best/plays for a game, ranked by the game's score direction. */
export function useLeaderboard(gameId: string, order: 'asc' | 'desc' = 'desc') {
  return useQuery({
    queryKey: qk.games.leaderboard(gameId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('game_scores')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const scores = data ?? [];
      return {
        entries: aggregateLeaderboard(scores, order),
        recent: scores.slice(0, 20),
        totalPlays: scores.length,
      };
    },
  });
}
