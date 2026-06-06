import { Mountain } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { GeorgiaRoute } from './routes/georgia.route';

export const georgiaFeature = defineFeature({
  id: 'georgia',
  title: 'Georgia',
  basePath: '/georgia',
  routes: [{ index: true, Component: GeorgiaRoute }],
  nav: [
    {
      label: 'Georgia',
      icon: Mountain,
      to: '/georgia',
      order: 230,
      placement: 'primary',
    },
  ],
});
