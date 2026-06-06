import { Flower2 } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { FlowersRoute } from './routes/flowers.route';

export const flowersFeature = defineFeature({
  id: 'flowers',
  title: 'Flowers',
  basePath: '/flowers',
  routes: [{ index: true, Component: FlowersRoute }],
  nav: [{ label: 'Flowers', icon: Flower2, to: '/flowers', order: 80 }],
});
