import { Handshake } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { PunitoListRoute } from './routes/punito-list.route';

export const punitoFeature = defineFeature({
  id: 'punito',
  title: 'Puñito',
  basePath: '/punito',
  routes: [{ index: true, Component: PunitoListRoute }],
  nav: [{ label: 'Puñito', icon: Handshake, to: '/punito', order: 130 }],
});
