import { PiggyBank } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const financeFeature = defineFeature({
  id: 'finance',
  title: 'Finance',
  basePath: '/finance',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/finance.route').then((m) => ({
          Component: m.FinanceRoute,
        })),
    },
  ],
  nav: [{ label: 'Finance', icon: PiggyBank, to: '/finance', order: 180 }],
});
