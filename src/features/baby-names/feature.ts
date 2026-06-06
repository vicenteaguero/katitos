import { Baby } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { BabyNamesListRoute } from './routes/baby-names-list.route';

export const babyNamesFeature = defineFeature({
  id: 'baby-names',
  title: 'Baby names',
  basePath: '/names',
  routes: [{ index: true, Component: BabyNamesListRoute }],
  nav: [{ label: 'Names', icon: Baby, to: '/names', order: 150 }],
});
