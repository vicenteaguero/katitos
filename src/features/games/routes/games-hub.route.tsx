import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { Empty, PageHeader } from '@kernel/ui';
import { gameRegistry } from '../registry';

export function GamesHubRoute() {
  const games = gameRegistry.all;
  return (
    <div className="curtain-reveal space-y-8">
      <PageHeader title="Games" subtitle="Play, compete, keep score" />
      {games.length === 0 ? (
        <Empty icon="🎭" title="No games yet" />
      ) : (
        <ul className="curtain-stagger space-y-3">
          {games.map((g, i) => (
            <li key={g.id} style={{ '--i': i } as React.CSSProperties}>
              <Link
                to={`/games/${g.id}`}
                className="lift-press flex items-center gap-5 rounded-lg bg-surface-2 px-6 py-6"
              >
                <span className="text-3xl leading-none">{g.emoji ?? '🎲'}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-2xl font-semibold leading-tight tracking-tight text-fg">
                    {g.title}
                  </span>
                  {g.description && (
                    <span className="mt-1 block font-sans text-xs leading-relaxed text-muted">
                      {g.description}
                    </span>
                  )}
                </span>
                <ChevronRight
                  size={18}
                  strokeWidth={1.75}
                  className="shrink-0 text-muted"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
