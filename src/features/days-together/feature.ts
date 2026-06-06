import { CalendarHeart } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { DaysTogetherRoute } from './routes/days-together.route';

export const daysTogetherFeature = defineFeature({
  id: 'days-together',
  title: 'Together',
  basePath: '/together',
  routes: [{ index: true, Component: DaysTogetherRoute }],
  nav: [{ label: 'Together', icon: CalendarHeart, to: '/together', order: 70 }],
});
