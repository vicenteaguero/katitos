import { Lightbulb } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { IdeaBankListRoute } from './routes/idea-bank-list.route';

export const ideaBankFeature = defineFeature({
  id: 'idea-bank',
  title: 'Idea bank',
  basePath: '/ideas',
  routes: [{ index: true, Component: IdeaBankListRoute }],
  nav: [{ label: 'Ideas', icon: Lightbulb, to: '/ideas', order: 160 }],
});
