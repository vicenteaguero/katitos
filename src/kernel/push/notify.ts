import { supabase } from '@kernel/supabase';

export interface NotifyPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  /** Defaults to the partner of the caller on the server. */
  toUserId?: string;
  /**
   * Only `'love'` pushes are actually delivered right now — every other
   * notification (tree, poke, wall note, sticker, know-me…) is suppressed so
   * testing doesn't spam the partner's phone. Flip ALLOW_ONLY_LOVE to re-enable.
   */
  kind?: 'love';
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
// Master switch: while testing, only the Send-love push goes out.
const ALLOW_ONLY_LOVE = true;

export async function notifyPartner(
  payload: NotifyPayload
): Promise<NotifyResult> {
  // Suppress everything that isn't an explicit love ping.
  if (ALLOW_ONLY_LOVE && payload.kind !== 'love') {
    return { ok: true, delivered: 0 };
  }
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
