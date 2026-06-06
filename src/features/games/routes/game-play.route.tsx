import { Link, useParams } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import { Empty, PageHeader } from '@kernel/ui';
import { gameRegistry } from '../registry';
import { GameHost } from '../components/game-host';
import { Leaderboard } from '../components/leaderboard';

export function GamePlayRoute() {
  const { gameId } = useParams<{ gameId: string }>();
  const game = gameId ? gameRegistry.byId(gameId) : undefined;
  useTableSync('game_scores', gameId ? qk.games.leaderboard(gameId) : ['noop']);

  if (!game) return <Empty icon="🎮" title="Game not found" />;

  return (
    <div className="space-y-5">
      <Link
        to="/games"
        className="inline-flex items-center gap-1 text-sm text-muted"
      >
        <ChevronLeft size={16} /> All games
      </Link>
      <PageHeader title={`${game.emoji ?? ''} ${game.title}`} />
      <GameHost game={game} />
      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted">Leaderboard</h2>
        <Leaderboard game={game} />
      </div>
    </div>
  );
}
