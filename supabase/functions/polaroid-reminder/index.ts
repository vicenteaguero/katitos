// The clock that remembers for us.
//
// Called every ten minutes by pg_cron (see 20260830000012). Everything else in
// this app pushes because a phone did something; this pushes because a phone
// DIDN'T — which means no phone is awake to notice, and the decision has to be
// made here.
//
// Two nudges, each at most once ever, per person, per day:
//
//   day_end    3h before midnight where YOU are, if today's photo isn't in.
//   last_call  1h before a day you borrowed from the other clock closes. She
//              wakes on the 12th while Curicó is still on the 11th; her 11th
//              lives only as long as his date does.
//
// Unlike push-notify, this reaches EITHER of them — it is not "notify my
// partner", it is "notify whoever is about to lose something". That is why it
// is a separate function with its own door: the only caller is the scheduler,
// holding the service-role key.
//
// Local invoke:
//   supabase functions serve --env-file ./supabase/functions/.env
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { corsHeaders, json } from '../_shared/cors.ts';
import { endOfDay, localDay } from './zone.ts';

/** Fire the end-of-day nudge with this much of the day left. */
const DAY_END_MS = 3 * 60 * 60 * 1000;
/** Fire the last call with this much of the borrowed day left. */
const LAST_CALL_MS = 60 * 60 * 1000;
/** Reminders older than this are bookkeeping nobody will ever read. */
const PRUNE_DAYS = 30;

type Kind = 'day_end' | 'last_call';

interface Member {
  user_id: string;
  role: string | null;
  timezone: string | null;
}

interface Due {
  member: Member;
  kind: Kind;
  day: string;
  title: string;
  body: string;
  url: string;
}

/**
 * Is this the scheduler, and not one of them?
 *
 * The platform gateway has already checked the token's signature — an invalid
 * one never reaches this file, it is refused upstream with
 * UNAUTHORIZED_INVALID_JWT_FORMAT. What it does NOT check is WHO: either of
 * their ordinary signed-in tokens would sail through, and this function can
 * push to both of them, so it needs its own door.
 *
 * That door is the `role` claim, not a string comparison against the service
 * key. Supabase issues service keys in two shapes now — the legacy JWT and the
 * newer opaque `sb_secret_…` — and the one injected into this function's
 * environment is not always the one the scheduler holds. Comparing the two
 * bytewise fails for a reason that has nothing to do with authorisation, and
 * that failure is silent and total: every reminder simply stops. So we ask the
 * verified token what it is, and accept the env key as well for the day the
 * scheduler carries the opaque form.
 */
function isScheduler(auth: string, serviceKey: string | undefined): boolean {
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return false;
  if (serviceKey && token === serviceKey) return true;
  try {
    const payload = token.split('.')[1];
    if (!payload) return false;
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)));
    return json?.role === 'service_role';
  } catch {
    return false;
  }
}

/** Her name for him, his name for her. Matches the rest of the app. */
function petName(role: string | null): string {
  return role === 'a' ? 'Katito' : 'Katita';
}

/** A zone we can actually pass to Intl. An unset one must never throw. */
function zoneOf(m: Member): string {
  if (!m.timezone) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: m.timezone });
    return m.timezone;
  } catch {
    return 'UTC';
  }
}

/** 'Tuesday' in that person's own date, for a line that reads like a sentence. */
function weekday(isoDay: string): string {
  return new Date(`${isoDay}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  });
}

/**
 * How much of the day is left, in words that are true.
 *
 * Normally this reads "3 hours" — the job runs every ten minutes and fires the
 * moment there are three or fewer. But if the scheduler was down, or there was
 * no phone to push to for a while, the first chance to say anything might come
 * with twenty minutes left, and calling that "1 hour" would be a lie told at
 * the exact moment it costs something.
 */
function timeLeft(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)} minutes`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? '1 hour' : `${hours} hours`;
}

/** 'Aug 11' — short, for the day about to disappear. */
function shortDate(isoDay: string): string {
  return new Date(`${isoDay}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
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

  // The scheduler is the only caller. A JWT from either of them must NOT be
  // able to make the app notify the other on demand — that is push-notify's
  // job, and it has its own rules about who may be reached.
  if (!isScheduler(req.headers.get('Authorization') ?? '', SERVICE_KEY)) {
    return json({ error: 'unauthorized' }, 401);
  }
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return json({ error: 'VAPID keys not configured' }, 500);
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  /**
   * Pretend it is some other moment.
   *
   * Every interesting thing this function does happens in a three-hour window
   * before a midnight eleven time zones from here. Waiting for the right hour
   * to find out whether it works is not testing, it is hoping — so the caller
   * may name the instant. Only the scheduler can reach this, and nothing else
   * changes: the ledger is still claimed and the push is still real.
   */
  const body = (await req.json().catch(() => ({}))) as {
    now?: string;
    dryRun?: boolean;
  };
  const now = body?.now ? new Date(body.now) : new Date();
  if (Number.isNaN(now.getTime())) {
    return json({ error: 'unreadable `now`' }, 400);
  }
  /**
   * Work out what WOULD be sent, and send nothing.
   *
   * The last-call nudge belongs to whoever is eleven hours ahead, which means
   * the only way to watch it fire is to buzz her phone. She should not be a
   * test fixture, so this answers the question without touching her.
   */
  const dryRun = body?.dryRun === true;

  const { data: members } = await admin
    .from('couple_members')
    .select('user_id, role, timezone');
  if (!members || members.length === 0) return json({ sent: 0, due: 0 });

  // Every date that is currently being lived by one of us — the same rule the
  // app and `polaroid_day_open()` use, written a third time because this runs
  // in Deno with neither of them in reach.
  const open = [...new Set(members.map((m) => localDay(zoneOf(m), now)))].sort(
    (a, b) => (a < b ? 1 : -1)
  );

  const { data: photos } = await admin
    .from('polaroids')
    .select('day, user_id, is_shared')
    .in('day', open);

  /** Does this person's day already have their photo on it? */
  const has = (userId: string, day: string) =>
    (photos ?? []).some(
      (p) => p.day === day && (p.user_id === userId || p.is_shared)
    );

  /**
   * When `day` stops being anybody's date. A day is gone at the LATEST of its
   * midnights across our zones — that lateness is the borrowed time itself.
   */
  const closesAt = (day: string) =>
    Math.max(
      ...members
        .filter((m) => localDay(zoneOf(m), now) === day)
        .map((m) => endOfDay(zoneOf(m), day).getTime())
    );

  const due: Due[] = [];

  for (const member of members as Member[]) {
    const zone = zoneOf(member);
    const today = localDay(zone, now);
    const partner = (members as Member[]).find(
      (m) => m.user_id !== member.user_id
    );
    const theirName = petName(partner?.role ?? null);

    // ── three hours of your own day left ──────────────────────────────────
    if (!has(member.user_id, today)) {
      const left = endOfDay(zone, today).getTime() - now.getTime();
      if (left > 0 && left <= DAY_END_MS) {
        due.push({
          member,
          kind: 'day_end',
          day: today,
          title: `📸 ${timeLeft(left)} of ${weekday(today)} left`,
          body: has(partner?.user_id ?? '', today)
            ? `${theirName}'s photo is up and yours isn't 🤍`
            : 'Your day is still an empty plate — tap to take it 🤍',
          url: '/polaroid?shoot=1',
        });
      }
    }

    // ── one hour of a borrowed day left ───────────────────────────────────
    // Only a day EARLIER than your own can be lost: when their date is ahead
    // of yours it is a day you have yet to live, not one running out.
    for (const day of open.filter((d) => d < today)) {
      if (has(member.user_id, day)) continue;
      const left = closesAt(day) - now.getTime();
      if (left > 0 && left <= LAST_CALL_MS) {
        due.push({
          member,
          kind: 'last_call',
          day,
          title: `🌙 ${timeLeft(left)} left for ${shortDate(day)}`,
          body: `It's still ${shortDate(day)} where ${theirName} is. Add yours before that day closes 🤍`,
          url: `/polaroid?catchup=${day}`,
        });
      }
    }
  }

  if (dryRun) {
    return json({
      dryRun: true,
      due: due.map((d) => ({
        who: d.member.role,
        kind: d.kind,
        day: d.day,
        title: d.title,
        body: d.body,
        url: d.url,
      })),
    });
  }

  let sent = 0;
  for (const item of due) {
    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', item.member.user_id);
    // No device to reach. Recording it as "said" would burn the one chance we
    // get to say it, so leave the ledger alone and try again in ten minutes.
    if (!subs || subs.length === 0) continue;

    // Claim it BEFORE sending. Two overlapping ticks both reach this line; the
    // primary key lets exactly one of them through, and the loser stays quiet.
    const { error: claim } = await admin
      .from('polaroid_reminders')
      .insert({ user_id: item.member.user_id, day: item.day, kind: item.kind });
    if (claim) continue; // 23505 — already said, or the row won't take. Either way: silence.

    const message = JSON.stringify({
      title: item.title,
      body: item.body,
      url: item.url,
      tag: `polaroid-${item.kind}`,
      vibrate: item.kind === 'last_call' ? [0, 60, 90, 60] : [0, 30, 40, 30],
    });

    const dead: string[] = [];
    let delivered = 0;
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            message
          );
          delivered++;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) dead.push(s.id);
        }
      })
    );
    if (dead.length) {
      await admin.from('push_subscriptions').delete().in('id', dead);
    }

    if (delivered === 0) {
      // Nothing actually landed — give the next tick its turn rather than
      // leaving a ledger row that says we warned someone we never warned.
      await admin
        .from('polaroid_reminders')
        .delete()
        .eq('user_id', item.member.user_id)
        .eq('day', item.day)
        .eq('kind', item.kind);
    }
    sent += delivered;
  }

  const cutoff = new Date(now.getTime() - PRUNE_DAYS * 86_400_000);
  await admin
    .from('polaroid_reminders')
    .delete()
    .lt('sent_at', cutoff.toISOString());

  return json({ due: due.length, sent });
});
