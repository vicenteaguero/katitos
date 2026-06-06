import { useSubmitScore } from '@kernel/engines/scoring';
import { toast } from '@kernel/ui';
import type { GameModule, GameResult } from '@kernel/registry';

/** Wraps a game's PlayComponent and persists results to the leaderboard. */
export function GameHost({ game }: { game: GameModule }) {
  const submit = useSubmitScore(game.id);
  const Play = game.PlayComponent;
  const fmt = game.formatScore ?? ((s: number) => String(s));

  const onFinish = (result: GameResult) => {
    submit.mutate(result, {
      onSuccess: () => toast.success(`Score saved: ${fmt(result.score)}`),
      onError: (e) => toast.error(e.message),
    });
  };

  return <Play onFinish={onFinish} />;
}
