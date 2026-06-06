import { Heart } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { PresenceRoute } from './routes/presence.route';

export const presenceFeature = defineFeature({
  id: 'presence',
  title: 'Connection',
  basePath: '/connection',
  routes: [{ index: true, Component: PresenceRoute }],
  nav: [{ label: 'Connection', icon: Heart, to: '/connection', order: 40 }],
});
