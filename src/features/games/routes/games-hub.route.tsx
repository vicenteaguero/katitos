import { Link } from 'react-router';
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
        <section className="space-y-5">
          <p className="eyebrow">Tonight's Programme</p>
          <ul className="curtain-stagger grid grid-cols-2 gap-4">
            {games.map((g, i) => (
              <li key={g.id} style={{ '--i': i } as React.CSSProperties}>
                <Link
                  to={`/games/${g.id}`}
                  className="velvet-2 gilt-hairline lift-press shadow-loge group flex h-full flex-col items-center gap-4 rounded-none px-5 py-8 text-center"
                >
                  <span className="gilt-text candle-flicker text-4xl leading-none">
                    {g.emoji ?? '🎲'}
                  </span>
                  <span className="font-display text-2xl font-semibold leading-tight tracking-tight text-fg">
                    {g.title}
                  </span>
                  <span className="seam w-10 opacity-70" aria-hidden="true" />
                  {g.description && (
                    <span className="font-sans text-xs leading-relaxed text-muted">
                      {g.description}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
