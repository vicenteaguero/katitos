import { PenLine } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const chalkboardFeature = defineFeature({
  id: 'chalkboard',
  title: 'The wall',
  basePath: '/wall',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/chalkboard.route').then((m) => ({
          Component: m.ChalkboardRoute,
        })),
    },
  ],
  nav: [
    {
      label: 'Wall',
      icon: PenLine,
      to: '/wall',
      order: 50,
      placement: 'primary',
    },
  ],
});
