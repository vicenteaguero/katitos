import { PiggyBank } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { FinanceRoute } from './routes/finance.route';

export const financeFeature = defineFeature({
  id: 'finance',
  title: 'Finance',
  basePath: '/finance',
  routes: [{ index: true, Component: FinanceRoute }],
  nav: [{ label: 'Finance', icon: PiggyBank, to: '/finance', order: 180 }],
});
