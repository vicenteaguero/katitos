import { Link, useParams } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import { Empty } from '@kernel/ui';
import { gameRegistry } from '../registry';
import { GameHost } from '../components/game-host';
import { Leaderboard } from '../components/leaderboard';

export function GamePlayRoute() {
  const { gameId } = useParams<{ gameId: string }>();
  const game = gameId ? gameRegistry.byId(gameId) : undefined;
  useTableSync('game_scores', gameId ? qk.games.leaderboard(gameId) : ['noop']);

  if (!game) return <Empty icon="🎭" title="Game not found" />;

  return (
    <div className="curtain-reveal space-y-8">
      <Link
        to="/games"
        className="lift-press inline-flex items-center gap-1 font-sans text-sm tracking-[0.02em] text-muted"
      >
        <ChevronLeft size={16} /> All games
      </Link>

      <header className="space-y-3 text-center">
        <p className="eyebrow">Now Playing</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-fg">
          <span
            className="gilt-text mr-2 align-middle text-3xl"
            aria-hidden="true"
          >
            {game.emoji ?? ''}
          </span>
          {game.title}
        </h1>
        {game.description && (
          <p className="mx-auto max-w-xs font-display text-lg font-light italic leading-snug text-muted">
            {game.description}
          </p>
        )}
        <span className="seam mx-auto !w-24" aria-hidden="true" />
      </header>

      <section className="bg-surface-2 rounded-lg p-7">
        <GameHost game={game} />
      </section>

      <section className="space-y-5">
        <p className="font-sans text-sm text-muted">Standings</p>
        <Leaderboard game={game} />
      </section>
    </div>
  );
}
