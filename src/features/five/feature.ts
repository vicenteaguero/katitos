import { Target } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const fiveFeature = defineFeature({
  id: 'five',
  title: 'The Five',
  basePath: '/five',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/five.route').then((m) => ({ Component: m.FiveRoute })),
    },
  ],
  nav: [{ label: 'The Five', icon: Target, to: '/five', order: 215 }],
});
