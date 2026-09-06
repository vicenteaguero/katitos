import { useEffect, useRef } from 'react';
import { supabase } from '@kernel/supabase';
import { usePartner } from '@kernel/auth';
import { notifyPartner } from '@kernel/push';
import { LATEST_KEY } from '../changelog';

/**
 * Tell her a new version landed - exactly once per release.
 *
 * Runs only on the admin's device (he ships them, she receives them). The claim
 * is a single atomic UPDATE with the old key in the WHERE clause, so if he has
 * the app open on two devices only one of them gets a row back and only one
 * push goes out. No extra infrastructure, no cron, no race.
 */
export function useAnnounceRelease(): void {
  const { self } = usePartner();
  const fired = useRef(false);

  useEffect(() => {
    if (!self?.is_admin || fired.current) return;
    fired.current = true;

    void (async () => {
      try {
        const { data, error } = await supabase
          .from('couple')
          .update({ changelog_announced_key: LATEST_KEY })
          .eq('id', true)
          // Whoever wins this predicate is the one that announces it.
          .or(
            `changelog_announced_key.is.null,changelog_announced_key.neq.${LATEST_KEY}`
          )
          .select('id');
        if (error || !data || data.length === 0) return;

        await notifyPartner({
          kind: 'update',
          title: '✨ Your Katito added new things',
          body: 'Open Katitos to see what changed 🤍',
          url: '/',
        });
      } catch {
        /* best-effort - the modal shows on her next open regardless */
      }
    })();
  }, [self?.is_admin]);
}
