import { HeartHandshake } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { KnowMeRoute } from './routes/know-me.route';

export const knowMeFeature = defineFeature({
  id: 'know-me',
  title: 'Know Me',
  basePath: '/know-me',
  routes: [{ index: true, Component: KnowMeRoute }],
  nav: [
    {
      label: 'Know Me',
      icon: HeartHandshake,
      to: '/know-me',
      order: 32,
    },
  ],
});
