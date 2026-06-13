import { BookHeart } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const cuteWordsFeature = defineFeature({
  id: 'cute-words',
  title: 'Cute words',
  basePath: '/words',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/cute-words-list.route').then((m) => ({
          Component: m.CuteWordsListRoute,
        })),
    },
  ],
  nav: [{ label: 'Words', icon: BookHeart, to: '/words', order: 120 }],
});
