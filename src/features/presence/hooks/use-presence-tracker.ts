import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePartner } from '@kernel/auth';
import { usePresence, useRealtimeSubscription } from '@kernel/realtime';
import { toast } from '@kernel/ui';
import { qk } from '@kernel/query';
import { useLogAppOpen } from '../api/presence.mutations';
import type { AppOpen } from '../api/presence.queries';
import { usePresenceStore } from '../store';

/**
 * Side-effects that run once the app is open: log the open + refresh last-seen,
 * and toast when the partner opens the app live. We deliberately do NOT
 * push-notify the partner on every open — that was notification spam.
 */
export function usePresenceTracker(): void {
  const { self, partner } = usePartner();
  const log = useLogAppOpen();
  const qc = useQueryClient();
  const done = useRef(false);
  const partnerRef = useRef(partner);
  partnerRef.current = partner;

  // Single presence subscription for the whole app; share via the store.
  const { onlineIds } = usePresence();
  const setOnline = usePresenceStore((s) => s.setOnline);
  useEffect(() => {
    setOnline([...onlineIds]);
  }, [onlineIds, setOnline]);

  useEffect(() => {
    if (!self || done.current) return;
    done.current = true;
    log.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [self]);

  useRealtimeSubscription<AppOpen>(
    { table: 'app_opens', event: 'INSERT' },
    (payload) => {
      const row = payload.new as AppOpen;
      const p = partnerRef.current;
      if (p && row.user_id === p.user_id) {
        toast.info(`${p.display_name} just opened Katitos ❤️`);
        void qc.invalidateQueries({ queryKey: qk.couple.members() });
        void qc.invalidateQueries({ queryKey: qk.presence.appOpens() });
      }
    }
  );
}
