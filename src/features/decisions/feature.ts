import { Scale } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const decisionsFeature = defineFeature({
  id: 'decisions',
  title: 'Decisions',
  basePath: '/decisions',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/decisions-list.route').then((m) => ({
          Component: m.DecisionsListRoute,
        })),
    },
  ],
  nav: [{ label: 'Decisions', icon: Scale, to: '/decisions', order: 140 }],
});
