import { usePartner } from '@kernel/auth';
import { localDay } from '../lib/polaroid-days';
import { useDayPolaroids } from './polaroid.queries';

/**
 * Have *I* posted my photo for my own today?
 *
 * Deliberately about me, not about the couple: with eleven hours between us,
 * "today" is a different date for each of us, and the nudge to take a photo has
 * to follow the person, not the pair.
 */
export function useMyTodayPolaroid() {
  const { self } = usePartner();
  const day = localDay(self?.timezone);
  const { data, isLoading } = useDayPolaroids(day);
  const mine =
    data?.find((p) => p.user_id === self?.user_id && !p.is_shared) ??
    // Before the split every photo was shared, so a legacy row still counts as
    // "there is a photo for today" rather than nagging for a second one.
    data?.find((p) => p.is_shared) ??
    null;
  return { day, mine, isLoading };
}
