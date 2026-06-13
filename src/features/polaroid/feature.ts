import { Camera } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const polaroidFeature = defineFeature({
  id: 'polaroid',
  title: 'Polaroid',
  basePath: '/polaroid',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/polaroid.route').then((m) => ({
          Component: m.PolaroidRoute,
        })),
    },
  ],
  nav: [
    {
      label: 'Polaroid',
      icon: Camera,
      to: '/polaroid',
      order: 10,
      placement: 'primary',
    },
  ],
});
