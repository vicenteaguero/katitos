import { Swords } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { FightTimerRoute } from './routes/fight-timer.route';

export const fightTimerFeature = defineFeature({
  id: 'fight-timer',
  title: 'Fights',
  basePath: '/fights',
  routes: [{ index: true, Component: FightTimerRoute }],
  nav: [{ label: 'Fights', icon: Swords, to: '/fights', order: 170 }],
});
