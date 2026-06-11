import { useMembers } from '@kernel/auth';
import { useLeaderboard } from '@kernel/engines/scoring';
import { Empty } from '@kernel/ui';
import { cn } from '@kernel/lib';
import type { GameModule } from '@kernel/registry';

export function Leaderboard({ game }: { game: GameModule }) {
  const { data } = useLeaderboard(game.id, game.scoreOrder);
  const { data: members } = useMembers();
  const fmt = game.formatScore ?? ((s: number) => String(s));
  const nameFor = (id: string) =>
    members?.find((m) => m.user_id === id)?.display_name ?? '—';

  if (!data || data.entries.length === 0) {
    return (
      <Empty
        icon="♛"
        title="No scores yet"
        hint="Be the first to take the stage."
      />
    );
  }

  return (
    <ol className="curtain-stagger space-y-3">
      {data.entries.map((e, i) => {
        const leader = i === 0;
        return (
          <li
            key={e.userId}
            style={{ '--i': i } as React.CSSProperties}
            className={cn(
              'gilt-hairline relative flex items-center justify-between gap-4 rounded-none px-5 py-4',
              leader
                ? 'velvet-2 candle-flicker shadow-loge'
                : 'velvet gilt-hairline-flat'
            )}
          >
            {leader && (
              <span
                aria-hidden="true"
                className="gold-shimmer pointer-events-none absolute inset-0 rounded-none"
              />
            )}
            <div className="relative flex min-w-0 items-baseline gap-3">
              <span
                className={cn(
                  'shrink-0 font-display text-lg leading-none tabular-nums',
                  leader ? 'gilt-text' : 'text-muted'
                )}
                aria-hidden="true"
              >
                {leader ? '♛' : String(i + 1).padStart(2, '0')}
              </span>
              <span
                className={cn(
                  'truncate font-display tracking-tight',
                  leader ? 'text-2xl text-fg' : 'text-xl text-fg/90'
                )}
              >
                {nameFor(e.userId)}
              </span>
            </div>
            <div className="relative flex shrink-0 flex-col items-end gap-0.5">
              <span
                className={cn(
                  'font-display text-xl leading-none tabular-nums',
                  leader ? 'gilt-text' : 'text-gold/90'
                )}
              >
                {fmt(e.best)}
              </span>
              <span className="font-sans text-xs tabular-nums text-muted">
                {e.plays} play{e.plays === 1 ? '' : 's'}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
