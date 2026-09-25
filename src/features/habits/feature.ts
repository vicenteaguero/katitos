import { Flame } from 'lucide-react';
import { defineFeature } from '@kernel/registry';

/**
 * Habits.
 *
 * One page: the run we keep together, the habits each of us holds, and the
 * money riding on hers - the gift it is earning her, and the bets her missed
 * days pay for. It used to be two features pretending to agree with each other.
 *
 * `/streak` is kept as a redirect because a year of push notifications deep-link
 * to it, and a dead link on a lock screen is a small betrayal.
 */
export const habitsFeature = defineFeature({
  id: 'habits',
  title: 'Habits',
  basePath: '/habits',
  routes: [
    {
      index: true,
      lazy: () =>
        import('./routes/habits.route').then((m) => ({
          Component: m.HabitsRoute,
        })),
    },
  ],
  nav: [{ label: 'Habits', icon: Flame, to: '/habits', order: 22 }],
});
