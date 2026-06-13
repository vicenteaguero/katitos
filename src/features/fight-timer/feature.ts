import { Swords } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const fightTimerFeature = defineFeature({
  id: 'fight-timer',
  title: 'Fights',
  basePath: '/fights',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/fight-timer.route').then((m) => ({
          Component: m.FightTimerRoute,
        })),
    },
  ],
  nav: [{ label: 'Fights', icon: Swords, to: '/fights', order: 170 }],
});
