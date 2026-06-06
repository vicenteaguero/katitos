import { Plane } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { TripsListRoute } from './routes/trips-list.route';
import { TripDetailRoute } from './routes/trip-detail.route';

export const travelFeature = defineFeature({
  id: 'travel',
  title: 'Travel',
  basePath: '/travel',
  routes: [
    { index: true, Component: TripsListRoute },
    { path: ':tripId', Component: TripDetailRoute },
  ],
  nav: [{ label: 'Travel', icon: Plane, to: '/travel', order: 190 }],
});
