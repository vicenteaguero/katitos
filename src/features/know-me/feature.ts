import { HeartHandshake } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const knowMeFeature = defineFeature({
  id: 'know-me',
  title: 'Know Me',
  basePath: '/know-me',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/know-me.route').then((m) => ({
          Component: m.KnowMeRoute,
        })),
    },
  ],
  nav: [
    {
      label: 'Know Me',
      icon: HeartHandshake,
      to: '/know-me',
      order: 32,
    },
  ],
});
