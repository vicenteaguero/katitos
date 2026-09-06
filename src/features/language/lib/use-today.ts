import { usePartner } from '@kernel/auth';
import { useNow } from '@kernel/hooks';
import { coupleDay } from '@kernel/lib';

/**
 * Today, for the two of us - the earlier of our two dates, as the rest of
 * the app counts it.
 *
 * "Due Friday" used to mean midnight in whichever zone the phone was in;
 * eleven hours apart, that was a different Friday for each of us, and the
 * homework read "1 day late" to one of us while the other still had the
 * evening.
 */
export function useToday(): string {
  const { self, partner } = usePartner();
  const now = useNow(60_000);
  return coupleDay(self?.timezone, partner?.timezone, now);
}
