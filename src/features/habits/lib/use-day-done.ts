import { useMoneyWho } from '../api/money.queries';
import { useStreak } from './use-streak';

/**
 * Whether every daily habit of mine is ticked today, read on my own phone.
 *
 * Null while it cannot be known yet. Each phone only ever judges its own
 * owner: the other one plays the cheer when this one sends it.
 */
export function useDayDone(): {
  day: string;
  done: boolean;
  isHim: boolean;
} | null {
  const { isKeeper, isSubject } = useMoneyWho();
  const view = useStreak();
  if (!(isKeeper || isSubject) || view.isLoading) return null;
  const { required, done } = view.statusOf(view.today).mine;
  return {
    day: view.today,
    done: required > 0 && done === required,
    isHim: isKeeper,
  };
}
