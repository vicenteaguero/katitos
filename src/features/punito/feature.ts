import { Handshake } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const punitoFeature = defineFeature({
  id: 'punito',
  title: 'Puñito',
  basePath: '/punito',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/punito-list.route').then((m) => ({
          Component: m.PunitoListRoute,
        })),
    },
  ],
  nav: [{ label: 'Puñito', icon: Handshake, to: '/punito', order: 130 }],
});
