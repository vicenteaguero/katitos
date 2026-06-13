import { Clock } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const timezoneFeature = defineFeature({
  id: 'timezone',
  title: 'Time',
  basePath: '/timezone',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/timezone.route').then((m) => ({
          Component: m.TimezoneRoute,
        })),
    },
  ],
  nav: [{ label: 'Time', icon: Clock, to: '/timezone', order: 100 }],
});
