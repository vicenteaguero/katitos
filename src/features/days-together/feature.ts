import { CalendarHeart } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const daysTogetherFeature = defineFeature({
  id: 'days-together',
  title: 'Together',
  basePath: '/together',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/days-together.route').then((m) => ({
          Component: m.DaysTogetherRoute,
        })),
    },
  ],
  nav: [{ label: 'Together', icon: CalendarHeart, to: '/together', order: 70 }],
});
