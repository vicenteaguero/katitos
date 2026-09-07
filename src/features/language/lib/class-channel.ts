import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@kernel/supabase';

/** Where the teacher is in the lesson, right now. */
export interface SlideMessage {
  blockId: string | null;
  index: number;
  total: number;
}

/** The learner's answer to a slide: "I am here, on this one". */
export interface AckMessage {
  index: number;
}

/** An ack older than this and he has probably put the phone down. */
const FOLLOWING_FOR_MS = 20_000;

/**
 * The class, live: one channel per lesson, on which teach mode says which
 * block is on screen and the lesson page follows - and answers, so she can
 * see he is with her.
 *
 * Broadcast, not a table - nothing about "she is on block four" is worth
 * keeping. The kernel already had the primitive; the classroom used none of it.
 */
export function useClassChannel(
  lessonId: string | undefined,
  onSlide?: (m: SlideMessage) => void
): {
  send: (m: SlideMessage) => void;
  ack: (m: AckMessage) => void;
  /** The slide he last said he was on, if that was in the last few seconds. */
  following: number | null;
} {
  const channel = useRef<RealtimeChannel | null>(null);
  const cb = useRef(onSlide);
  cb.current = onSlide;
  const [last, setLast] = useState<{ index: number; at: number } | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!lessonId) return;
    const ch = supabase.channel(`class:${lessonId}`, {
      config: { broadcast: { self: false } },
    });
    ch.on('broadcast', { event: 'slide' }, (msg) =>
      cb.current?.(msg.payload as SlideMessage)
    );
    ch.on('broadcast', { event: 'ack' }, (msg) =>
      setLast({ index: (msg.payload as AckMessage).index, at: Date.now() })
    );
    ch.subscribe();
    channel.current = ch;
    return () => {
      channel.current = null;
      void supabase.removeChannel(ch);
    };
  }, [lessonId]);

  // "Following" wears off; re-check a few seconds after the last ack.
  useEffect(() => {
    if (!last) return;
    const t = window.setTimeout(
      () => setTick((n) => n + 1),
      FOLLOWING_FOR_MS + 50
    );
    return () => window.clearTimeout(t);
  }, [last, tick]);

  const send = useCallback((m: SlideMessage) => {
    void channel.current?.send({
      type: 'broadcast',
      event: 'slide',
      payload: m,
    });
  }, []);
  const ack = useCallback((m: AckMessage) => {
    void channel.current?.send({ type: 'broadcast', event: 'ack', payload: m });
  }, []);
  const following =
    last && Date.now() - last.at < FOLLOWING_FOR_MS ? last.index : null;
  return { send, ack, following };
}
