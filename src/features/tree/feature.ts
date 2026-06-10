import { TreePine } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { TreeRoute } from './routes/tree.route';

export const treeFeature = defineFeature({
  id: 'tree',
  title: 'Our Tree',
  basePath: '/tree',
  routes: [{ index: true, Component: TreeRoute }],
  nav: [{ label: 'Our Tree', icon: TreePine, to: '/tree', order: 21 }],
});
