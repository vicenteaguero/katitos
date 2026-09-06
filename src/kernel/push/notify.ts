import { supabase } from '@kernel/supabase';

/**
 * Every kind of ping we can send. Naming them is what lets us mute the noisy
 * ones without muting the ones that matter - the old code had a single boolean
 * that silenced everything except "love", including things worth knowing.
 */
export type NotifyKind =
  | 'love' // a sweet nothing, sent on purpose
  | 'polaroid' // your love posted their photo for the day
  | 'wall' // a new note on the wall
  | 'album' // a photo added to a book
  | 'wishlist' // something added to a gift list
  | 'flower' // this month's bouquet arrived
  | 'know-me' // tonight's answers are ready
  | 'monthsversary' // the 15th, wherever either of us is
  | 'update' // a new version, with a changelog to read
  | 'lesson' // a new lesson or homework is waiting
  | 'tree' // the tree was watered
  | 'presence'; // your love opened the app

/**
 * Which kinds actually reach a phone.
 *
 * Deliberately a set, not a boolean. `presence` stays off: it fired on every
 * single app open and was pure noise. Everything else here is something you'd
 * genuinely want to know from eleven time zones away.
 */
const DELIVERED: ReadonlySet<NotifyKind> = new Set<NotifyKind>([
  'love',
  'polaroid',
  'wall',
  'album',
  'wishlist',
  'flower',
  'know-me',
  'monthsversary',
  'update',
  'tree',
  'lesson',
]);

/** Per-kind presentation, so a lock screen says what kind of thing arrived. */
const PRESENTATION: Record<NotifyKind, { tag: string; vibrate?: number[] }> = {
  love: { tag: 'love', vibrate: [0, 40, 60, 40] },
  polaroid: { tag: 'polaroid', vibrate: [0, 30] },
  wall: { tag: 'wall', vibrate: [0, 25] },
  album: { tag: 'album' },
  wishlist: { tag: 'wishlist' },
  flower: { tag: 'flower', vibrate: [0, 30, 40, 30] },
  'know-me': { tag: 'know-me' },
  monthsversary: { tag: 'monthsversary', vibrate: [0, 50, 80, 50, 80, 50] },
  update: { tag: 'update', vibrate: [0, 30, 40, 30] },
  tree: { tag: 'tree' },
  lesson: { tag: 'lesson', vibrate: [0, 30] },
  presence: { tag: 'presence' },
};

export interface NotifyPayload {
  kind: NotifyKind;
  title: string;
  body?: string;
  url?: string;
  /** Overrides the per-kind default; use to collapse repeats of one thing. */
  tag?: string;
  /** A picture for the notification (Android shows it; iOS ignores it). */
  image?: string;
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
 * Best-effort - never throws. Reports both whether the call succeeded AND how
 * many devices it actually reached, so callers can tell "couldn't send" from
 * "your love hasn't turned notifications on yet" (delivered === 0).
 */
export async function notifyPartner(
  payload: NotifyPayload
): Promise<NotifyResult> {
  if (!DELIVERED.has(payload.kind)) {
    return { ok: true, delivered: 0 };
  }
  const look = PRESENTATION[payload.kind];
  try {
    const { data, error } = await supabase.functions.invoke<{ sent?: number }>(
      'push-notify',
      {
        body: {
          ...payload,
          tag: payload.tag ?? look.tag,
          vibrate: look.vibrate,
        },
      }
    );
    if (error) return { ok: false, delivered: 0 };
    return { ok: true, delivered: data?.sent ?? 0 };
  } catch {
    /* swallow - push is non-critical */
    return { ok: false, delivered: 0 };
  }
}
