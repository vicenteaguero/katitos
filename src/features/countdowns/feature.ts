import { Timer } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { CountdownsListRoute } from './routes/countdowns-list.route';

export const countdownsFeature = defineFeature({
  id: 'countdowns',
  title: 'Countdowns',
  basePath: '/countdowns',
  routes: [{ index: true, Component: CountdownsListRoute }],
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
