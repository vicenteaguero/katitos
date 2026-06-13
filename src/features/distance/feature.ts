import { MapPin } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

export const distanceFeature = defineFeature({
  id: 'distance',
  title: 'Distance',
  basePath: '/distance',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/distance.route').then((m) => ({
          Component: m.DistanceRoute,
        })),
    },
  ],
  nav: [{ label: 'Distance', icon: MapPin, to: '/distance', order: 90 }],
});
