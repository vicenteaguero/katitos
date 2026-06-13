import { Languages } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { DecksRoute } from './routes/decks.route';
import { DeckRoute } from './routes/deck.route';
import { PlayRoute } from './routes/play.route';

export const languageFeature = defineFeature({
  id: 'language',
  title: 'Language',
  basePath: '/language',
  routes: [
    { index: true, Component: DecksRoute },
    { path: 'deck/:deckId', Component: DeckRoute },
    { path: 'play/:deckId', Component: PlayRoute },
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
