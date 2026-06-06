import { Clock } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { TimezoneRoute } from './routes/timezone.route';

export const timezoneFeature = defineFeature({
  id: 'timezone',
  title: 'Time',
  basePath: '/timezone',
  routes: [{ index: true, Component: TimezoneRoute }],
  nav: [{ label: 'Time', icon: Clock, to: '/timezone', order: 100 }],
});
