import { CalendarDays } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { DatesListRoute } from './routes/dates-list.route';
import { DateDetailRoute } from './routes/date-detail.route';

export const datesFeature = defineFeature({
  id: 'dates',
  title: 'Dates',
  basePath: '/dates',
  routes: [
    { index: true, Component: DatesListRoute },
    { path: ':dateId', Component: DateDetailRoute },
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
