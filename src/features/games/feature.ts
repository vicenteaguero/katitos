import { Gamepad2 } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const gamesFeature = defineFeature({
  id: 'games',
  title: 'Games',
  basePath: '/games',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/games-hub.route').then((m) => ({
          Component: m.GamesHubRoute,
        })),
    },
    {
      path: ':gameId',
      lazy: () =>
        import('./routes/game-play.route').then((m) => ({
          Component: m.GamePlayRoute,
        })),
    },
  ],
  nav: [
    {
      label: 'Games',
      icon: Gamepad2,
      to: '/games',
      order: 60,
      placement: 'primary',
    },
  ],
});
