import { MapPin } from 'lucide-react';
import { defineFeature } from '@kernel/registry';
import { DistanceRoute } from './routes/distance.route';

export const distanceFeature = defineFeature({
  id: 'distance',
  title: 'Distance',
  basePath: '/distance',
  routes: [{ index: true, Component: DistanceRoute }],
  nav: [{ label: 'Distance', icon: MapPin, to: '/distance', order: 90 }],
});
