import { Baby } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const babyNamesFeature = defineFeature({
  id: 'baby-names',
  title: 'Baby names',
  basePath: '/names',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/baby-names-list.route').then((m) => ({
          Component: m.BabyNamesListRoute,
        })),
    },
  ],
  nav: [{ label: 'Names', icon: Baby, to: '/names', order: 150 }],
});
