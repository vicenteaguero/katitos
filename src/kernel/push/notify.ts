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
 * Best-effort — never throws. Returns whether the request was accepted, so
 * callers can give honest feedback ("Sent" vs "couldn't send").
 */
export async function notifyPartner(payload: NotifyPayload): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('push-notify', {
      body: payload,
    });
    return !error;
  } catch {
    /* swallow — push is non-critical */
    return false;
  }
}
