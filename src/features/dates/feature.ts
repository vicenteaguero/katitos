import { CalendarDays } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const datesFeature = defineFeature({
  id: 'dates',
  title: 'Dates',
  basePath: '/dates',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/dates-list.route').then((m) => ({
          Component: m.DatesListRoute,
        })),
    },
    {
      path: ':dateId',
      lazy: () =>
        import('./routes/date-detail.route').then((m) => ({
          Component: m.DateDetailRoute,
        })),
    },
  ],
  nav: [
    {
      label: 'Dates',
      icon: CalendarDays,
      to: '/dates',
      order: 200,
      placement: 'primary',
    },
  ],
});
