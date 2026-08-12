import { Languages } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const languageFeature = defineFeature({
  id: 'language',
  title: 'Language',
  basePath: '/language',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/decks.route').then((m) => ({
          Component: m.DecksRoute,
        })),
    },
    {
      path: 'deck/:deckId',
      lazy: () =>
        import('./routes/deck.route').then((m) => ({ Component: m.DeckRoute })),
    },
    {
      path: 'study',
      lazy: () =>
        import('./routes/study.route').then((m) => ({
          Component: m.StudyRoute,
        })),
    },
    {
      path: 'play/:deckId',
      lazy: () =>
        import('./routes/play.route').then((m) => ({ Component: m.PlayRoute })),
    },
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
