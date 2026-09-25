import { usePartner } from '@kernel/auth';
import { FIVE_OPEN } from './goals';

/**
 * Is the Five hers yet, or still only his?
 *
 * One answer, used in three places: the row in her drawer, the card on her home,
 * and the route itself. The route matters more than it looks - the first two are
 * only the ways in, and "she would never type a URL she has not been told about"
 * is a guess, not a guarantee. A feature that is meant to be invisible is
 * invisible at the door as well.
 *
 * Opening it is `FIVE_OPEN` in goals.ts, the same constant in the scheduler's
 * copy at supabase/functions/_shared/five-goals.ts, and a changelog entry.
 */
export function useFiveVisible(): boolean {
  const { self } = usePartner();
  return FIVE_OPEN || !!self?.is_admin;
}
