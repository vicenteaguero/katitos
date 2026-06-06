import { Link } from 'react-router';
import { Card, Empty, PageHeader } from '@kernel/ui';
import { gameRegistry } from '../registry';

export function GamesHubRoute() {
  const games = gameRegistry.all;
  return (
    <div>
      <PageHeader title="Games" subtitle="Play, compete, keep score" />
      {games.length === 0 ? (
        <Empty icon="🎮" title="No games yet" />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {games.map((g) => (
            <Link key={g.id} to={`/games/${g.id}`}>
              <Card className="flex h-full flex-col items-center gap-1 py-5 text-center">
                <span className="text-3xl">{g.emoji ?? '🎲'}</span>
                <span className="font-semibold">{g.title}</span>
                {g.description && (
                  <span className="text-xs text-muted">{g.description}</span>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
