import { Mountain } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const georgiaFeature = defineFeature({
  id: 'georgia',
  title: 'Georgia',
  basePath: '/georgia',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/georgia.route').then((m) => ({
          Component: m.GeorgiaRoute,
        })),
    },
  ],
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
