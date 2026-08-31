import { useEffect, useMemo, useState } from 'react';
import { usePartner } from '@kernel/auth';
import { borrowedDay, localDay } from '../lib/polaroid-days';
import { useOpenDayPolaroids } from './polaroid.queries';

/**
 * What the camera button in the bottom bar should be, right now.
 *
 * Three states, and every one of them is tappable — the button is never hidden
 * and never dead, because a nav item that sometimes isn't there is worse than
 * one that says "nothing to do".
 *
 *   'shoot'   your own today has no photo. The one that twinkles.
 *   'rescue'  today is done, but the day you borrowed from the other clock is
 *             still empty and about to close. She wakes on the 12th while
 *             Curicó is still on the 11th; that 11th is hers for a few more
 *             hours and then it is gone. Tapping goes straight there.
 *   'done'    everything that can be filled is filled. Grey, still, finished
 *             until tomorrow.
 *
 * `state` follows YOUR clock, never the couple's. Eleven hours apart, one of us
 * is usually finished while the other hasn't started.
 */
export type NudgeState = 'shoot' | 'rescue' | 'done';

export interface PolaroidNudge {
  state: NudgeState;
  /** Your own civil date. */
  today: string;
  /** The day 'rescue' is about, or null in the other two states. */
  rescueDay: string | null;
  isLoading: boolean;
}

/**
 * Re-read the wall clock every minute, but only re-render when the DATE
 * actually turns over. Without this the button keeps yesterday's answer until
 * something else happens to re-render the shell — which, at 00:00, is exactly
 * when it is most wrong.
 */
function useCivilDay(zone: string | null | undefined): string {
  const [day, setDay] = useState(() => localDay(zone));
  useEffect(() => {
    setDay(localDay(zone));
    const id = setInterval(() => {
      setDay((prev) => {
        const next = localDay(zone);
        return next === prev ? prev : next;
      });
    }, 60_000);
    return () => clearInterval(id);
  }, [zone]);
  return day;
}

export function usePolaroidNudge(): PolaroidNudge {
  const { self, partner } = usePartner();
  const today = useCivilDay(self?.timezone);
  const theirToday = useCivilDay(partner?.timezone);

  const days = useMemo(
    () => [...new Set([today, theirToday])],
    [today, theirToday]
  );
  const { data, isLoading } = useOpenDayPolaroids(days);

  return useMemo(() => {
    const rows = data ?? [];
    // A legacy pre-split photo was taken by the couple, so it counts as mine —
    // nagging for a second photo on a day we lived together would be wrong.
    const filled = (day: string) =>
      rows.some(
        (r) => r.day === day && (r.user_id === self?.user_id || r.is_shared)
      );

    const borrowed = borrowedDay(self?.timezone, partner?.timezone);
    const rescueDay = borrowed && !filled(borrowed) ? borrowed : null;

    const state: NudgeState = !filled(today)
      ? 'shoot'
      : rescueDay
        ? 'rescue'
        : 'done';

    return { state, today, rescueDay, isLoading };
  }, [
    data,
    isLoading,
    self?.user_id,
    self?.timezone,
    partner?.timezone,
    today,
  ]);
}
