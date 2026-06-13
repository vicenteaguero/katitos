import { Heart } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const presenceFeature = defineFeature({
  id: 'presence',
  title: 'Connection',
  basePath: '/connection',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/presence.route').then((m) => ({
          Component: m.PresenceRoute,
        })),
    },
  ],
  nav: [{ label: 'Connection', icon: Heart, to: '/connection', order: 40 }],
});
