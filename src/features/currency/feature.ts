import { defineFeature } from '@kernel/registry';
import { ExchangeIcon } from './components/exchange-icon';

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
  nav: [{ label: 'Currency', icon: ExchangeIcon, to: '/currency', order: 110 }],
});
