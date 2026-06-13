import { Coins } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const currencyFeature = defineFeature({
  id: 'currency',
  title: 'Currency',
  basePath: '/currency',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/currency.route').then((m) => ({
          Component: m.CurrencyRoute,
        })),
    },
  ],
  nav: [{ label: 'Currency', icon: Coins, to: '/currency', order: 110 }],
});
