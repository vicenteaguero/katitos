import { useCallback, useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@kernel/supabase';

/** Where the teacher is in the lesson, right now. */
export interface SlideMessage {
  blockId: string | null;
  index: number;
  total: number;
}

/**
 * The class, live: one channel per lesson, on which teach mode says which
 * block is on screen and the lesson page follows.
 *
 * Broadcast, not a table - nothing about "she is on block four" is worth
 * keeping. The kernel already had the primitive; the classroom used none of it.
 */
export function useClassChannel(
  lessonId: string | undefined,
  onSlide?: (m: SlideMessage) => void
): { send: (m: SlideMessage) => void } {
  const channel = useRef<RealtimeChannel | null>(null);
  const cb = useRef(onSlide);
  cb.current = onSlide;

  useEffect(() => {
    if (!lessonId) return;
    const ch = supabase.channel(`class:${lessonId}`, {
      config: { broadcast: { self: false } },
    });
    ch.on('broadcast', { event: 'slide' }, (msg) =>
      cb.current?.(msg.payload as SlideMessage)
    );
    ch.subscribe();
    channel.current = ch;
    return () => {
      channel.current = null;
      void supabase.removeChannel(ch);
    };
  }, [lessonId]);

  const send = useCallback((m: SlideMessage) => {
    void channel.current?.send({
      type: 'broadcast',
      event: 'slide',
      payload: m,
    });
  }, []);
  return { send };
}
