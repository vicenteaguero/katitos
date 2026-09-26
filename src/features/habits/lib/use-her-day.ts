import { useMoneyWho } from '../api/money.queries';
import { useStreak } from './use-streak';

/**
 * Whether every daily habit of hers is ticked today, read on her own phone.
 *
 * Null while it cannot be known yet, or on his phone: the cheer is hers to
 * set off, and his screen only ever plays it when hers sends it.
 */
export function useHerDayDone(): { day: string; done: boolean } | null {
  const { isSubject } = useMoneyWho();
  const view = useStreak();
  if (!isSubject || view.isLoading) return null;
  const { required, done } = view.statusOf(view.today).mine;
  return { day: view.today, done: required > 0 && done === required };
}
