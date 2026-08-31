import {
  Baby,
  BookHeart,
  CalendarHeart,
  Clock,
  Gamepad2,
  Handshake,
  Lightbulb,
  MapPin,
  PiggyBank,
  Scale,
  Swords,
  Timer,
} from 'lucide-react';
import type { NavEntry } from '@kernel/registry';

/**
 * Ideas, listed but not built.
 *
 * The "Soon" rows in the More drawer are the visible sense of a long runway —
 * proof there is more coming. They used to be a side effect of a feature being
 * shipped-but-locked, which meant the only way to show an idea was to build it
 * first, and the only way to delete dead code was to lose the row.
 *
 * This list breaks that tie. A row here needs no route, no tables and no code:
 * it is an idea we want to see on the shelf. Add one freely. When it gets
 * built for real, delete its line here and let the feature registry take over.
 *
 * `to` is never navigated — a locked drawer row is inert (see nav.tsx) and the
 * router mounts nothing for these paths. It only has to be unique.
 */
export const SOON: NavEntry[] = [
  {
    label: 'Countdowns',
    icon: Timer,
    to: '/countdowns',
    order: 20,
    category: 'Utilities',
  },
  { label: 'Games', icon: Gamepad2, to: '/games', order: 60, category: 'Play' },
  {
    label: 'Together',
    icon: CalendarHeart,
    to: '/together',
    order: 70,
    category: 'Pololos',
  },
  {
    label: 'Distance',
    icon: MapPin,
    to: '/distance',
    order: 90,
    category: 'Pololos',
  },
  {
    label: 'Time',
    icon: Clock,
    to: '/timezone',
    order: 100,
    category: 'Pololos',
  },
  {
    label: 'Words',
    icon: BookHeart,
    to: '/words',
    order: 120,
    category: 'Pololos',
  },
  {
    label: 'Puñito',
    icon: Handshake,
    to: '/punito',
    order: 130,
    category: 'Pololos',
  },
  {
    label: 'Decisions',
    icon: Scale,
    to: '/decisions',
    order: 140,
    category: 'Pololos',
  },
  { label: 'Names', icon: Baby, to: '/names', order: 150, category: 'Pololos' },
  {
    label: 'Ideas',
    icon: Lightbulb,
    to: '/ideas',
    order: 160,
    category: 'Utilities',
  },
  {
    label: 'Fights',
    icon: Swords,
    to: '/fights',
    order: 170,
    category: 'Pololos',
  },
  {
    label: 'Finance',
    icon: PiggyBank,
    to: '/finance',
    order: 180,
    category: 'Utilities',
  },
];
