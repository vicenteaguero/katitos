import { Coins } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { CurrencyRoute } from './routes/currency.route';

export const currencyFeature = defineFeature({
  id: 'currency',
  title: 'Currency',
  basePath: '/currency',
  routes: [{ index: true, Component: CurrencyRoute }],
  nav: [{ label: 'Currency', icon: Coins, to: '/currency', order: 110 }],
});
