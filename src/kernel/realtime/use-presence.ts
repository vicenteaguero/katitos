import { useEffect, useRef, useState } from 'react';
import { supabase } from '@kernel/supabase';
import { useUserId } from '@kernel/auth';

const PRESENCE_CHANNEL = 'katitos-presence';

interface PresenceMeta {
  user_id: string;
  online_at: string;
}

/**
 * Tracks who is currently online via Supabase Realtime Presence. Returns the
 * set of online user ids and fires `onPartnerJoin` when the partner appears.
 */
export function usePresence(onPartnerJoin?: (partnerId: string) => void): {
  onlineIds: Set<string>;
} {
  const userId = useUserId();
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const joinCb = useRef(onPartnerJoin);
  joinCb.current = onPartnerJoin;

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: userId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceMeta>();
        setOnlineIds(new Set(Object.keys(state)));
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        if (key !== userId) joinCb.current?.(key);
      })
      .subscribe((statusStr) => {
        if (statusStr === 'SUBSCRIBED') {
          void channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          } satisfies PresenceMeta);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return { onlineIds };
}
