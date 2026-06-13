import { Timer } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const countdownsFeature = defineFeature({
  id: 'countdowns',
  title: 'Countdowns',
  basePath: '/countdowns',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/countdowns-list.route').then((m) => ({
          Component: m.CountdownsListRoute,
        })),
    },
  ],
  nav: [
    {
      label: 'Countdowns',
      icon: Timer,
      to: '/countdowns',
      order: 20,
      placement: 'primary',
    },
  ],
});
