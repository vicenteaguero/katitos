import { Plane } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const summerFeature = defineFeature({
  id: 'summer',
  title: 'Summer',
  basePath: '/summer',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/summer.route').then((m) => ({
          Component: m.SummerRoute,
        })),
    },
  ],
  nav: [
    {
      label: 'Summer',
      icon: Plane,
      to: '/summer',
      order: 230,
      placement: 'primary',
    },
  ],
});
