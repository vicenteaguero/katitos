import { Languages } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { PhrasesListRoute } from './routes/phrases-list.route';
import { PracticeRoute } from './routes/practice.route';

export const languageFeature = defineFeature({
  id: 'language',
  title: 'Language',
  basePath: '/language',
  routes: [
    { index: true, Component: PhrasesListRoute },
    { path: 'practice/:language', Component: PracticeRoute },
  ],
  nav: [
    {
      label: 'Language',
      icon: Languages,
      to: '/language',
      order: 220,
    },
  ],
});
