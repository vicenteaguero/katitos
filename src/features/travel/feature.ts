import { Plane } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const travelFeature = defineFeature({
  id: 'travel',
  title: 'Travel',
  basePath: '/travel',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/trips-list.route').then((m) => ({
          Component: m.TripsListRoute,
        })),
    },
    {
      path: ':tripId',
      lazy: () =>
        import('./routes/trip-detail.route').then((m) => ({
          Component: m.TripDetailRoute,
        })),
    },
  ],
  nav: [{ label: 'Travel', icon: Plane, to: '/travel', order: 190 }],
});
