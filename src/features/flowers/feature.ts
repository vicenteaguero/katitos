import { Flower2 } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const flowersFeature = defineFeature({
  id: 'flowers',
  title: 'Flowers',
  basePath: '/flowers',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/flowers.route').then((m) => ({
          Component: m.FlowersRoute,
        })),
    },
  ],
  nav: [{ label: 'Flowers', icon: Flower2, to: '/flowers', order: 80 }],
});
