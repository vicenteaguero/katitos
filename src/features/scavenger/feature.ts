import { Trophy } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const scavengerFeature = defineFeature({
  id: 'scavenger',
  title: 'Date cards',
  basePath: '/scavenger',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/scavenger.route').then((m) => ({
          Component: m.ScavengerRoute,
        })),
    },
  ],
  nav: [{ label: 'Date cards', icon: Trophy, to: '/scavenger', order: 240 }],
});
