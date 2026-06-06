import { supabase } from '@kernel/supabase';

export interface NotifyPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  /** Defaults to the partner of the caller on the server. */
  toUserId?: string;
}

/**
 * Ask the push-notify Edge Function to deliver a Web Push to the partner.
 * Best-effort — never throws (presence/in-app notifications cover the gap when
 * the device hasn't subscribed, e.g. local dev without an installed PWA).
 */
export async function notifyPartner(payload: NotifyPayload): Promise<void> {
  try {
    await supabase.functions.invoke('push-notify', { body: payload });
  } catch {
    /* swallow — push is non-critical */
  }
}
