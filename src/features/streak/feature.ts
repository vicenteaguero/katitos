import { Flame } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const streakFeature = defineFeature({
  id: 'streak',
  title: 'Our streak',
  basePath: '/streak',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/streak.route').then((m) => ({
          Component: m.StreakRoute,
        })),
    },
  ],
  nav: [{ label: 'Streak', icon: Flame, to: '/streak', order: 22 }],
});
