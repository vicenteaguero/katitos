import { TreePine } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const treeFeature = defineFeature({
  id: 'tree',
  title: 'Our Tree',
  basePath: '/tree',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/tree.route').then((m) => ({ Component: m.TreeRoute })),
    },
  ],
  nav: [{ label: 'Our Tree', icon: TreePine, to: '/tree', order: 21 }],
});
