import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { GameResult } from '@kernel/registry';

/** Persist a game result to the shared leaderboard table. */
export function useSubmitScore(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (result: GameResult) => {
      const { error } = await supabase.from('game_scores').insert({
        game_id: gameId,
        score: result.score,
        meta: (result.meta ?? {}) as never,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.games.leaderboard(gameId) });
    },
  });
}
