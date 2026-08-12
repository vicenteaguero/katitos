// Web-push fan-out. Called by the client (or a DB webhook) to notify the
// partner — e.g. "Vicente just opened Katitos" or a new chalkboard note.
//
// Sends to every push subscription belonging to the target user. Identical code
// runs locally and in the cloud; only the VAPID env differs.
//
// Local invoke:
//   supabase functions serve --env-file ./supabase/functions/.env
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { corsHeaders, json } from '../_shared/cors.ts';

interface NotifyBody {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  /** A picture for the notification (Android only; iOS ignores it). */
  image?: string;
  /** Per-kind buzz pattern. */
  vibrate?: number[];
  /** Optional explicit target; defaults to the caller's partner. */
  toUserId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY');
  const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY');
  const VAPID_SUBJECT =
    Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@katitos.local';

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return json({ error: 'VAPID keys not configured' }, 500);
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

  const authHeader = req.headers.get('Authorization') ?? '';
  const payload: NotifyBody = await req.json().catch(() => ({}));

  // Identify the caller from their JWT (RLS-scoped client).
  const userClient = createClient(SUPABASE_URL, SERVICE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // The partner is the ONLY valid recipient (one couple, two members). Resolve
  // it server-side; an explicit toUserId is honored only if it IS the partner,
  // so the function can't be used to notify (spam) arbitrary users.
  const { data: members } = await admin
    .from('couple_members')
    .select('user_id');
  const partner = members?.find((m) => m.user_id !== user.id)?.user_id;
  if (!partner) return json({ error: 'no partner' }, 400);
  if (payload.toUserId && payload.toUserId !== partner) {
    return json({ error: 'forbidden target' }, 403);
  }
  const target = partner;

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', target);

  if (!subs || subs.length === 0) return json({ sent: 0, reason: 'no subs' });

  const message = JSON.stringify({
    title: payload.title ?? 'Katitos',
    body: payload.body ?? '',
    url: payload.url ?? '/',
    tag: payload.tag,
    image: payload.image,
    vibrate: payload.vibrate,
  });

  let sent = 0;
  const dead: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          message
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) dead.push(s.id);
      }
    })
  );

  // Prune expired subscriptions.
  if (dead.length) {
    await admin.from('push_subscriptions').delete().in('id', dead);
  }

  return json({ sent, pruned: dead.length });
});
