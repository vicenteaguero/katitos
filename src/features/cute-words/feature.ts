import { BookHeart } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { CuteWordsListRoute } from './routes/cute-words-list.route';

export const cuteWordsFeature = defineFeature({
  id: 'cute-words',
  title: 'Cute words',
  basePath: '/words',
  routes: [{ index: true, Component: CuteWordsListRoute }],
  nav: [{ label: 'Words', icon: BookHeart, to: '/words', order: 120 }],
});
