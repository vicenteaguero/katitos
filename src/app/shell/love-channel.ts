import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@kernel/supabase';

/**
 * The love-burst broadcast channel. Sending love plays an on-screen burst for
 * the sender instantly and - over this Supabase broadcast channel - on the
 * partner's screen too. (The native push still covers the app-closed case.)
 */
export type BurstKind = 'love' | 'cheer';
type Listener = (note: string, kind: BurstKind) => void;
const listeners = new Set<Listener>();
let channel: RealtimeChannel | null = null;

function ensureChannel(): RealtimeChannel {
  if (channel) return channel;
  channel = supabase.channel('love-burst', {
    config: { broadcast: { self: false } },
  });
  for (const kind of ['love', 'cheer'] as const) {
    channel.on('broadcast', { event: kind }, (msg) => {
      const note = (msg.payload as { note?: string } | undefined)?.note ?? '';
      listeners.forEach((l) => l(note, kind));
    });
  }
  channel.subscribe();
  return channel;
}

function send(note: string, kind: BurstKind): void {
  try {
    void ensureChannel().send({
      type: 'broadcast',
      event: kind,
      payload: { note },
    });
  } catch {
    /* best-effort - the local burst below still plays */
  }
  listeners.forEach((l) => l(note, kind));
}

/** Broadcast + play a love burst. Safe to call from anywhere. */
export function sendLoveBurst(note: string): void {
  send(note, 'love');
}

/** Broadcast + play the congratulations festival: all her habits are in. */
export function sendCheerBurst(note: string): void {
  send(note, 'cheer');
}

/** Subscribe to incoming love bursts. Returns an unsubscribe fn. */
export function addLoveListener(l: Listener): () => void {
  ensureChannel();
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
