import { supabase } from '@kernel/supabase';

export interface NotifyPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  /** Defaults to the partner of the caller on the server. */
  toUserId?: string;
}

export interface NotifyResult {
  /** The request reached the function and it accepted it (no transport error). */
  ok: boolean;
  /** How many of the partner's devices actually received the push. */
  delivered: number;
}

/**
 * Ask the push-notify Edge Function to deliver a Web Push to the partner.
 * Best-effort — never throws. Reports both whether the call succeeded AND how
 * many devices it actually reached, so callers can tell "couldn't send" from
 * "your love hasn't turned notifications on yet" (delivered === 0).
 */
export async function notifyPartner(
  payload: NotifyPayload
): Promise<NotifyResult> {
  try {
    const { data, error } = await supabase.functions.invoke<{ sent?: number }>(
      'push-notify',
      { body: payload }
    );
    if (error) return { ok: false, delivered: 0 };
    return { ok: true, delivered: data?.sent ?? 0 };
  } catch {
    /* swallow — push is non-critical */
    return { ok: false, delivered: 0 };
  }
}
