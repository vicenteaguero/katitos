import { Scale } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { DecisionsListRoute } from './routes/decisions-list.route';

export const decisionsFeature = defineFeature({
  id: 'decisions',
  title: 'Decisions',
  basePath: '/decisions',
  routes: [{ index: true, Component: DecisionsListRoute }],
  nav: [{ label: 'Decisions', icon: Scale, to: '/decisions', order: 140 }],
});
