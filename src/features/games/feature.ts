import { Gamepad2 } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { GamesHubRoute } from './routes/games-hub.route';
import { GamePlayRoute } from './routes/game-play.route';

export const gamesFeature = defineFeature({
  id: 'games',
  title: 'Games',
  basePath: '/games',
  routes: [
    { index: true, Component: GamesHubRoute },
    { path: ':gameId', Component: GamePlayRoute },
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
