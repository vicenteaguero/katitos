import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@kernel/supabase';

/**
 * The love-burst broadcast channel. Sending love plays an on-screen burst for
 * the sender instantly and — over this Supabase broadcast channel — on the
 * partner's screen too. (The native push still covers the app-closed case.)
 */
type Listener = (note: string) => void;
const listeners = new Set<Listener>();
let channel: RealtimeChannel | null = null;

function ensureChannel(): RealtimeChannel {
  if (channel) return channel;
  channel = supabase.channel('love-burst', {
    config: { broadcast: { self: false } },
  });
  channel.on('broadcast', { event: 'love' }, (msg) => {
    const note = (msg.payload as { note?: string } | undefined)?.note ?? '';
    listeners.forEach((l) => l(note));
  });
  channel.subscribe();
  return channel;
}

/** Broadcast + play a love burst. Safe to call from anywhere. */
export function sendLoveBurst(note: string): void {
  try {
    void ensureChannel().send({
      type: 'broadcast',
      event: 'love',
      payload: { note },
    });
  } catch {
    /* best-effort — the local burst below still plays */
  }
  listeners.forEach((l) => l(note));
}

/** Subscribe to incoming love bursts. Returns an unsubscribe fn. */
export function addLoveListener(l: Listener): () => void {
  ensureChannel();
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
