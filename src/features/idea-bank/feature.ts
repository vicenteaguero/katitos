import { Lightbulb } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const ideaBankFeature = defineFeature({
  id: 'idea-bank',
  title: 'Idea bank',
  basePath: '/ideas',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/idea-bank-list.route').then((m) => ({
          Component: m.IdeaBankListRoute,
        })),
    },
  ],
  nav: [{ label: 'Ideas', icon: Lightbulb, to: '/ideas', order: 160 }],
});
