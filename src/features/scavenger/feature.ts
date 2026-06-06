import { Trophy } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { ScavengerRoute } from './routes/scavenger.route';

export const scavengerFeature = defineFeature({
  id: 'scavenger',
  title: 'Date cards',
  basePath: '/scavenger',
  routes: [{ index: true, Component: ScavengerRoute }],
  nav: [{ label: 'Date cards', icon: Trophy, to: '/scavenger', order: 240 }],
});
