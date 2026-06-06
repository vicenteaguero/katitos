import { useMembers } from '@kernel/auth';
import { useLeaderboard } from '@kernel/engines/scoring';
import { Empty } from '@kernel/ui';
import type { GameModule } from '@kernel/registry';

export function Leaderboard({ game }: { game: GameModule }) {
  const { data } = useLeaderboard(game.id, game.scoreOrder);
  const { data: members } = useMembers();
  const fmt = game.formatScore ?? ((s: number) => String(s));
  const nameFor = (id: string) =>
    members?.find((m) => m.user_id === id)?.display_name ?? '—';

  if (!data || data.entries.length === 0) {
    return (
      <Empty icon="🏆" title="No scores yet" hint="Be the first to play!" />
    );
  }

  return (
    <div className="space-y-2">
      {data.entries.map((e, i) => (
        <div
          key={e.userId}
          className="flex items-center justify-between rounded-lg bg-surface px-3 py-2"
        >
          <span className="font-medium">
            {i === 0 ? '👑 ' : ''}
            {nameFor(e.userId)}
          </span>
          <span className="tabular-nums text-sm text-muted">
            {fmt(e.best)} · {e.plays} play{e.plays === 1 ? '' : 's'}
          </span>
        </div>
      ))}
    </div>
  );
}
