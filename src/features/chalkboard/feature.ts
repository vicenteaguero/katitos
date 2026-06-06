import { PenLine } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { ChalkboardRoute } from './routes/chalkboard.route';

export const chalkboardFeature = defineFeature({
  id: 'chalkboard',
  title: 'The wall',
  basePath: '/wall',
  routes: [{ index: true, Component: ChalkboardRoute }],
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
