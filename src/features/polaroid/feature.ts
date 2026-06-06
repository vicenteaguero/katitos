import { Camera } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { PolaroidRoute } from './routes/polaroid.route';

export const polaroidFeature = defineFeature({
  id: 'polaroid',
  title: 'Polaroid',
  basePath: '/polaroid',
  routes: [{ index: true, Component: PolaroidRoute }],
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
