// The clock that keeps the streak alive.
//
// Called every ten minutes by pg_cron (see 20260907000002). Sibling of
// polaroid-reminder, and for the same reason: this pushes because a phone
// DIDN'T do something, so no phone is awake to notice and the decision has to
// be made here.
//
// Two nudges, each at most once ever, per person, per day:
//
//   day_end    3h before midnight where YOU are, if anything of yours for
//              today is still unticked.
//   last_call  1h before yesterday stops being fixable. The window closes when
//              the LATER of our two clocks passes the end of the day after it,
//              which for him is early afternoon and for her is the middle of
//              the night - so this one is genuinely the last chance.
//
// Only the shared habit and the person's own daily habits count. A weekly one
// is not urgent on any particular evening, and buzzing a phone about something
// that has five days left is how notifications get turned off.
//
// Local invoke:
//   supabase functions serve --env-file ./supabase/functions/.env
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { corsHeaders, json } from '../_shared/cors.ts';
import { endOfDay, localDay, nextDay, startOfDay } from '../_shared/zone.ts';

/** Fire the end-of-day nudge with this much of your own day left. */
const DAY_END_MS = 3 * 60 * 60 * 1000;
/** Fire the last call with this much of the grace window left. */
const LAST_CALL_MS = 60 * 60 * 1000;
/** Reminders older than this are bookkeeping nobody will ever read. */
const PRUNE_DAYS = 30;

type Kind = 'day_end' | 'last_call';

interface Member {
  user_id: string;
  role: string | null;
  timezone: string | null;
}

interface Habit {
  id: string;
  user_id: string | null;
  kind: string;
  schedule: string;
  title: string;
  effective_from: string;
  archived_at: string | null;
}

interface Due {
  member: Member;
  kind: Kind;
  day: string;
  title: string;
  body: string;
}

/** Same door as polaroid-reminder: the scheduler's claim, not a key comparison. */
function isScheduler(auth: string, serviceKey: string | undefined): boolean {
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return false;
  if (serviceKey && token === serviceKey) return true;
  try {
    const payload = token.split('.')[1];
    if (!payload) return false;
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const parsed = JSON.parse(
      atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
    );
    return parsed?.role === 'service_role';
  } catch {
    return false;
  }
}

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

/** How much is left, in words that stay true when the scheduler was down. */
function timeLeft(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)} minutes`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? '1 hour' : `${hours} hours`;
}

function activeOn(h: Habit, day: string): boolean {
  if (day < h.effective_from) return false;
  if (h.archived_at && day >= h.archived_at.slice(0, 10)) return false;
  return true;
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

  if (!isScheduler(req.headers.get('Authorization') ?? '', SERVICE_KEY)) {
    return json({ error: 'unauthorized' }, 401);
  }
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return json({ error: 'VAPID keys not configured' }, 500);
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Name the instant, and say what would be sent without sending it. The
  // last-call nudge belongs to whoever is eleven hours ahead, and she should
  // not have to be a test fixture.
  const body = (await req.json().catch(() => ({}))) as {
    now?: string;
    dryRun?: boolean;
  };
  const now = body?.now ? new Date(body.now) : new Date();
  if (Number.isNaN(now.getTime()))
    return json({ error: 'unreadable `now`' }, 400);
  const dryRun = body?.dryRun === true;

  const { data: members } = await admin
    .from('couple_members')
    .select('user_id, role, timezone');
  if (!members || members.length === 0) return json({ sent: 0, due: 0 });

  const { data: habits } = await admin
    .from('habits')
    .select('id, user_id, kind, schedule, title, effective_from, archived_at')
    .is('archived_at', null);
  const daily = ((habits ?? []) as Habit[]).filter(
    (h) => h.schedule === 'daily'
  );
  if (daily.length === 0) return json({ sent: 0, due: 0 });

  // Every date either of us could still be ticking: our two current dates, and
  // the day before each of them, which the grace window keeps open.
  const yesterdayOf = (day: string) =>
    new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000)
      .toISOString()
      .slice(0, 10);
  const todays = (members as Member[]).map((m) => localDay(zoneOf(m), now));
  const lookup = [...new Set([...todays, ...todays.map(yesterdayOf)])].sort();

  const { data: entries } = await admin
    .from('habit_entries')
    .select('habit_id, day')
    .in('day', lookup);
  const ticked = new Set((entries ?? []).map((e) => `${e.habit_id}:${e.day}`));

  const { data: streak } = await admin.rpc('streak_days');
  const runningDays = typeof streak === 'number' ? streak : 0;

  /**
   * What this person still owes on this day: their own daily habits, plus the
   * shared one when neither of us has claimed it yet.
   */
  const owed = (m: Member, day: string): string[] =>
    daily
      .filter((h) => activeOn(h, day))
      .filter((h) => h.kind === 'shared' || h.user_id === m.user_id)
      .filter((h) => !ticked.has(`${h.id}:${day}`))
      .map((h) => (h.kind === 'shared' ? 'our call' : h.title));

  /**
   * The instant a day stops being fixable by anyone.
   *
   * A day is open while the later of our clocks has not passed the end of the
   * day after it - so it closes the moment the FIRST of us reaches that point,
   * which is always whoever is ahead.
   */
  const closesAt = (day: string) =>
    Math.min(
      ...(members as Member[]).map((m) =>
        startOfDay(zoneOf(m), nextDay(nextDay(day))).getTime()
      )
    );

  const due: Due[] = [];

  for (const member of members as Member[]) {
    const zone = zoneOf(member);
    const today = localDay(zone, now);
    const partner = (members as Member[]).find(
      (m) => m.user_id !== member.user_id
    );
    const theirName = petName(partner?.role ?? null);
    const run = runningDays > 0 ? ` Don't lose the ${runningDays} 🔥` : '';

    // ── three hours of your own day left ──────────────────────────────────
    const todo = owed(member, today);
    if (todo.length > 0) {
      const left = endOfDay(zone, today).getTime() - now.getTime();
      if (left > 0 && left <= DAY_END_MS) {
        due.push({
          member,
          kind: 'day_end',
          day: today,
          title: `🔥 ${timeLeft(left)} left today`,
          body: `Still to tick: ${todo.join(', ')}.${run}`,
        });
      }
    }

    // ── one hour of the grace window left ─────────────────────────────────
    const yesterday = yesterdayOf(today);
    const late = owed(member, yesterday);
    if (late.length > 0) {
      const left = closesAt(yesterday) - now.getTime();
      if (left > 0 && left <= LAST_CALL_MS) {
        due.push({
          member,
          kind: 'last_call',
          day: yesterday,
          title: `🌙 Last chance for yesterday`,
          body: `${timeLeft(left)} to tick ${late.join(', ')} before it closes for ${theirName} too.${run}`,
        });
      }
    }
  }

  if (dryRun) {
    return json({
      dryRun: true,
      streak: runningDays,
      due: due.map((d) => ({
        who: d.member.role,
        kind: d.kind,
        day: d.day,
        title: d.title,
        body: d.body,
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
    // get, so leave the ledger alone and try again in ten minutes.
    if (!subs || subs.length === 0) continue;

    // Claim it BEFORE sending; the primary key lets exactly one tick through.
    const { error: claim } = await admin
      .from('habit_reminders')
      .insert({ user_id: item.member.user_id, day: item.day, kind: item.kind });
    if (claim) continue;

    const message = JSON.stringify({
      title: item.title,
      body: item.body,
      url: '/streak',
      tag: `streak-${item.kind}`,
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
    if (dead.length)
      await admin.from('push_subscriptions').delete().in('id', dead);

    if (delivered === 0) {
      // Nothing landed - give the next tick its turn rather than leaving a row
      // saying we warned someone we never warned.
      await admin
        .from('habit_reminders')
        .delete()
        .eq('user_id', item.member.user_id)
        .eq('day', item.day)
        .eq('kind', item.kind);
    }
    sent += delivered;
  }

  const cutoff = new Date(now.getTime() - PRUNE_DAYS * 86_400_000);
  await admin
    .from('habit_reminders')
    .delete()
    .lt('sent_at', cutoff.toISOString());

  return json({ due: due.length, sent, streak: runningDays });
});
