// The Five, kept by the clock.
//
// Called every ten minutes by pg_cron (see 20260925000002). It does four things,
// per person, in that person's own zone:
//
//   plan       on the first tick of her day, choose five random moments, one
//              inside each goal's window, and write them down. Random ONCE:
//              re-rolling every tick would mean a reminder that is always ten
//              minutes away and never arrives.
//   nudge      when a planned moment has passed and the goal is still open, one
//              push, at most once ever, for that goal and that day.
//   last call  ninety minutes before her midnight, name the money still on the
//              table. Her day stays tappable until 3AM, so this is a nudge and
//              not a wall.
//   close      at 3AM her time the day is done and the ledger is written: a
//              dollar to her gift pot per goal she did, three to the bet pot per
//              goal she did not. A hard day or a paused Five writes nothing at
//              all.
//
// While FIVE_OPEN is false she does not exist as a recipient: every push above
// goes to him instead, so the cadence and the wording get tuned on his phone
// before they ever reach hers.
//
// Local invoke:
//   supabase functions serve --env-file ./supabase/functions/.env
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { corsHeaders, json } from '../_shared/cors.ts';
import { endOfDay, localDay, startOfDay } from '../_shared/zone.ts';
import {
  FIVE_GOALS,
  FIVE_GOAL_IDS,
  FIVE_OPEN,
  GRACE_HOUR,
} from '../_shared/five-goals.ts';

/** Warn this long before her midnight. */
const LAST_CALL_MS = 90 * 60 * 1000;
/** A nudge planned more than this long ago is stale - the day moved on. */
const STALE_MS = 4 * 60 * 60 * 1000;
/** How far back an unsettled day is still worth closing. */
const CLOSE_LOOKBACK_DAYS = 7;
/** Rows nobody will ever read again. */
const PRUNE_DAYS = 45;

/** The pseudo-goals the reminder ledger uses to remember one-off pushes. */
const LAST_CALL = '_last_call';
const CLOSED = '_closed';
const QUIET = '_quiet';
const UNPLACED = '_unplaced';

/** This many silent closed days in a row and the Five switches itself off. */
const QUIET_DAYS = 3;
/** Owed to the bookmaker and not yet placed, before he is reminded. */
const UNPLACED_CENTS = 3000;

interface Member {
  user_id: string;
  role: string | null;
  timezone: string | null;
  is_admin: boolean | null;
  display_name: string | null;
}

interface Settings {
  gift_cents: number;
  bet_cents: number;
  active: boolean;
  /** The first day the Five counts. Nothing before it is ever settled. */
  started_on: string;
}

/**
 * Is this the scheduler, and not one of them?
 *
 * The same door as `polaroid-reminder`, for the same reason: the gateway checks
 * that the token is valid, never who it belongs to, and this function can push
 * to both of them. The `role` claim is the check; the env key is accepted too,
 * for the day the scheduler carries the opaque `sb_secret_…` form.
 */
function isScheduler(auth: string, serviceKey: string | undefined): boolean {
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return false;
  if (serviceKey && token === serviceKey) return true;
  try {
    const payload = token.split('.')[1];
    if (!payload) return false;
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(
      atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
    );
    return claims?.role === 'service_role';
  } catch {
    return false;
  }
}

/** A zone Intl will accept. An unset one must never throw. */
function zoneOf(m: Member): string {
  if (!m.timezone) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: m.timezone });
    return m.timezone;
  } catch {
    return 'UTC';
  }
}

/** The day before an ISO date, as 'YYYY-MM-DD'. */
function prevDay(isoDay: string): string {
  const d = new Date(`${isoDay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** When `day` stops being correctable for her: 3AM the morning after. */
function closesAt(zone: string, isoDay: string): Date {
  return new Date(endOfDay(zone, isoDay).getTime() + GRACE_HOUR * 3_600_000);
}

/** Dollars, the way a notification should say them: $9, never $9.00. */
function money(cents: number): string {
  const d = cents / 100;
  return `$${Number.isInteger(d) ? d : d.toFixed(2)}`;
}

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
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

  /**
   * Pretend it is some other moment, and optionally send nothing.
   *
   * Everything here happens at an hour eleven time zones away, and the close is
   * at 3AM. Waiting for the real hour to find out whether it works is hoping,
   * not testing, so the caller may name the instant - and only the scheduler can
   * reach this door.
   */
  const body = (await req.json().catch(() => ({}))) as {
    now?: string;
    dryRun?: boolean;
  };
  const now = body?.now ? new Date(body.now) : new Date();
  if (Number.isNaN(now.getTime())) {
    return json({ error: 'unreadable `now`' }, 400);
  }
  const dryRun = body?.dryRun === true;

  const { data: members } = await admin
    .from('couple_members')
    .select('user_id, role, timezone, is_admin, display_name');
  if (!members || members.length === 0) return json({ planned: 0, sent: 0 });

  try {
    const all = members as Member[];
    const keeper = all.find((m) => m.is_admin) ?? all[0];

    /** Whose five these are. Not his: he is the one who pays for them. */
    const subjects = all.filter((m) => !m.is_admin);

    const planned: Record<string, string>[] = [];
    const pushes: {
      to: Member;
      tag: string;
      title: string;
      body: string;
      url: string;
      vibrate?: number[];
      /**
       * The reminder-ledger row that makes this push a once-ever thing.
       *
       * `stamp` for a goal nudge, whose row was already planned this morning:
       * the claim is stamping its empty `sent_at`. `insert` for the one-off
       * pushes that have no planned row, where the primary key is the claim.
       */
      claim: {
        how: 'stamp' | 'insert';
        user_id: string;
        day: string;
        goal_id: string;
      };
    }[] = [];
    const settled: Record<string, unknown>[] = [];
    /** People the scheduler switched off for, after days of silence. */
    const quieted: { user: string; since: string }[] = [];
    /** Subjects whose Five began on this very tick. */
    const began: { user: string; on: string }[] = [];

    for (const subject of subjects) {
      const zone = zoneOf(subject);
      const today = localDay(zone, now);

      /**
       * Her row, created here the first time she is seen.
       *
       * Written by the scheduler rather than by a screen, because the day the Five
       * begins is the day the CLOCK starts caring, and neither of them may ever
       * open the dials. `started_on` defaults to today in the database, so the
       * first tick is the first day and every day before it stays outside.
       */
      let { data: settingsRow } = await admin
        .from('five_settings')
        .select('gift_cents, bet_cents, active, started_on')
        .eq('user_id', subject.user_id)
        .maybeSingle();
      if (!settingsRow) {
        if (dryRun) {
          began.push({
            user: subject.display_name ?? subject.user_id,
            on: today,
          });
          continue; // nothing to close on a day that starts now
        }
        await admin
          .from('five_settings')
          .insert({ user_id: subject.user_id, started_on: today });
        const again = await admin
          .from('five_settings')
          .select('gift_cents, bet_cents, active, started_on')
          .eq('user_id', subject.user_id)
          .maybeSingle();
        settingsRow = again.data;
        began.push({
          user: subject.display_name ?? subject.user_id,
          on: today,
        });
      }
      const settings: Settings = {
        gift_cents: settingsRow?.gift_cents ?? 100,
        bet_cents: settingsRow?.bet_cents ?? 300,
        active: settingsRow?.active ?? true,
        started_on: settingsRow?.started_on ?? today,
      };

      // She switched it off. Nothing is asked of her and nothing moves - which is
      // the whole point of the switch existing.
      if (!settings.active) continue;

      // Everything from the oldest day we might still close, forwards.
      const from = (() => {
        let d = today;
        for (let i = 0; i < CLOSE_LOOKBACK_DAYS; i++) d = prevDay(d);
        return d;
      })();

      const { data: marks } = await admin
        .from('five_marks')
        .select('day, goal_id, revoked_at')
        .eq('user_id', subject.user_id)
        .gte('day', from);
      const { data: days } = await admin
        .from('five_days')
        .select('day, hard_day')
        .eq('user_id', subject.user_id)
        .gte('day', from);
      const { data: ledger } = await admin
        .from('five_ledger')
        .select('day')
        .eq('user_id', subject.user_id)
        .not('goal_id', 'is', null)
        .gte('day', from);
      const { data: reminders } = await admin
        .from('five_reminders')
        .select('day, goal_id, slot_at, sent_at')
        .eq('user_id', subject.user_id)
        .gte('day', from);
      // Every stretch that could still cover a day in the lookback, including the
      // one that is still open (`to_day` null).
      const { data: pauses } = await admin
        .from('five_pauses')
        .select('from_day, to_day')
        .eq('user_id', subject.user_id)
        .or(`to_day.is.null,to_day.gte.${from}`);

      const isLive = (day: string, goalId: string) =>
        (marks ?? []).some(
          (m) => m.day === day && m.goal_id === goalId && !m.revoked_at
        );
      const isHard = (day: string) =>
        (days ?? []).some((d) => d.day === day && d.hard_day);
      const isSettled = (day: string) =>
        (ledger ?? []).some((l) => l.day === day);
      /** Was the Five switched off on this day? Then it has no money on it. */
      const pausedOn = (day: string) =>
        (pauses ?? []).some(
          (p) => p.from_day <= day && (!p.to_day || p.to_day >= day)
        );
      const reminder = (day: string, goalId: string) =>
        (reminders ?? []).find((r) => r.day === day && r.goal_id === goalId);

      // ── plan today's five moments ─────────────────────────────────────────
      if (!isHard(today)) {
        const dayStart = startOfDay(zone, today).getTime();
        for (const goal of FIVE_GOALS) {
          if (reminder(today, goal.id)) continue;
          const [from_, to] = goal.window;
          const spread = Math.max(0, to - from_);
          const at = dayStart + (from_ + Math.random() * spread) * 3_600_000;
          // The window is already behind us - the first tick of this day came
          // late (a deploy, an outage). Say nothing rather than firing a
          // lunchtime reminder at midnight.
          const slot = at < now.getTime() - STALE_MS ? null : at;
          if (slot === null) continue;
          planned.push({
            user: subject.display_name ?? subject.user_id,
            day: today,
            goal: goal.id,
            at: new Date(slot).toISOString(),
          });
          if (!dryRun) {
            await admin.from('five_reminders').insert({
              user_id: subject.user_id,
              day: today,
              goal_id: goal.id,
              slot_at: new Date(slot).toISOString(),
            });
          }
        }
      }

      // ── a moment has arrived ──────────────────────────────────────────────
      if (!isHard(today)) {
        for (const goal of FIVE_GOALS) {
          const row = reminder(today, goal.id);
          if (!row || row.sent_at) continue;
          if (new Date(row.slot_at).getTime() > now.getTime()) continue;
          if (isLive(today, goal.id)) continue;
          pushes.push({
            to: FIVE_OPEN ? subject : keeper,
            tag: `five-${goal.id}`,
            title: `${goal.emoji} ${goal.label}`,
            body: pick(goal.nudges),
            url: '/five',
            vibrate: [0, 30],
            claim: {
              how: 'stamp',
              user_id: subject.user_id,
              day: today,
              goal_id: goal.id,
            },
          });
        }
      }

      // ── ninety minutes of her day left ────────────────────────────────────
      const open = FIVE_GOAL_IDS.filter((id) => !isLive(today, id));
      const leftToday = endOfDay(zone, today).getTime() - now.getTime();
      if (
        !isHard(today) &&
        open.length > 0 &&
        leftToday > 0 &&
        leftToday <= LAST_CALL_MS &&
        !reminder(today, LAST_CALL)
      ) {
        pushes.push({
          to: FIVE_OPEN ? subject : keeper,
          tag: 'five-last-call',
          // Deliberately no figure. At half past ten on a bad day, "$9 goes to
          // the bookmaker" offers two moves: tap three things she did not do, or
          // close the app - and it is the only place that ever mentions the valve.
          title: '🕚 Still time',
          body: 'Anything you did today counts until 3. And the hard-day button is there 🤍',
          url: '/five',
          vibrate: [0, 60, 90, 60],
          claim: {
            how: 'insert',
            user_id: subject.user_id,
            day: today,
            goal_id: LAST_CALL,
          },
        });
      }

      // ── has she gone quiet? ───────────────────────────────────────────────
      //
      // Nothing in the design noticed that she had stopped answering, so a bad
      // week kept closing at fifteen dollars a day and kept buzzing her about it.
      // A silent stretch is the symptom, not laziness, and the right response is
      // to stop the meter and tell HIM - not to make the number louder.
      const closedDays: string[] = [];
      for (let d = prevDay(today), i = 0; i < QUIET_DAYS; i++, d = prevDay(d)) {
        if (closesAt(zone, d).getTime() > now.getTime()) break;
        if (d <= settings.started_on) break;
        closedDays.push(d);
      }
      const silent =
        closedDays.length === QUIET_DAYS &&
        closedDays.every(
          (d) =>
            !isHard(d) &&
            !pausedOn(d) &&
            FIVE_GOAL_IDS.every((id) => !isLive(d, id))
        );
      if (silent) {
        quieted.push({
          user: subject.display_name ?? subject.user_id,
          since: closedDays[closedDays.length - 1],
        });
        if (!dryRun) {
          await admin
            .from('five_settings')
            .update({ active: false })
            .eq('user_id', subject.user_id);
          await admin
            .from('five_pauses')
            .update({ from_day: closedDays[closedDays.length - 1] })
            .eq('user_id', subject.user_id)
            .is('to_day', null);
        }
        pushes.push({
          to: keeper,
          tag: 'five-quiet',
          title: '🤍 Three quiet days',
          body:
            'Nothing ticked since ' +
            closedDays[closedDays.length - 1] +
            '. The Five is off and nothing is being charged. Ring her.',
          url: '/five',
          claim: {
            how: 'insert',
            user_id: subject.user_id,
            day: today,
            goal_id: QUIET,
          },
        });
        continue; // nothing else is asked of her, and nothing else is charged
      }

      // ── close every day whose 3AM has passed ──────────────────────────────
      // One summary a tick, however many days are owed: a backlog is a scheduler
      // that was down, not seven things he needs to hear about in one minute.
      let told = false;
      for (
        let d = prevDay(today), i = 0;
        i < CLOSE_LOOKBACK_DAYS;
        i++, d = prevDay(d)
      ) {
        // Before the Five began there is nothing to settle - those days are not
        // misses, they are days nobody was ever asked about - and the first day
        // itself is on the house: she may not have heard of this yet when it
        // started, and charging her for the hours before she was told would be a
        // strange way to begin.
        if (d <= settings.started_on) break;
        if (isSettled(d)) continue;
        if (closesAt(zone, d).getTime() > now.getTime()) continue;

        // A day she had it switched off is not a day she missed. Skipping it here
        // is what makes coming back after a week free instead of a $105 bill.
        if (pausedOn(d)) {
          settled.push({ day: d, paused: true });
          continue;
        }

        const done = FIVE_GOAL_IDS.filter((id) => isLive(d, id));
        const missed = FIVE_GOAL_IDS.filter((id) => !isLive(d, id));
        const hard = isHard(d);
        // A hard day forgives every miss and keeps every dollar she held. It used
        // to zero both, which meant the one button for her worst days took away
        // what she had already earned.
        const gift = done.length * settings.gift_cents;
        const bet = hard ? 0 : missed.length * settings.bet_cents;
        settled.push({ day: d, done: done.length, gift, bet, hardDay: hard });

        if (!dryRun) {
          const rows = FIVE_GOAL_IDS.filter((id) => isLive(d, id) || !hard).map(
            (id) => {
              const live = isLive(d, id);
              return {
                user_id: subject.user_id,
                day: d,
                goal_id: id,
                direction: live ? 'gift' : 'bet',
                amount_cents: live ? settings.gift_cents : settings.bet_cents,
                reason: live ? 'done' : 'missed',
              };
            }
          );
          // The unique index is the rule: two overlapping ticks both arrive here
          // and exactly one set of rows lands. A hard day where she held nothing
          // has no rows at all, and that is what "nothing moved" looks like.
          if (rows.length > 0) await admin.from('five_ledger').insert(rows);
        }

        // He is told how the day closed, always - the money is his, and this is
        // the opening line of the conversation they agreed to have.
        if (!reminder(d, CLOSED) && !told) {
          told = true;
          pushes.push({
            to: keeper,
            tag: 'five-day',
            title: hard
              ? 'The Five: a hard day'
              : `The Five: ${done.length} of 5`,
            body: hard
              ? `She called it a hard day, and it cost nothing. ${money(gift)} to her gift. Ring her.`
              : missed.length === 0
                ? `A perfect day. ${money(gift)} to her gift pot 🤍`
                : `${money(gift)} to her gift, ${money(bet)} to burn on ${missed.length === 1 ? 'a bet' : 'bets'}.`,
            url: '/five',
            claim: {
              how: 'insert',
              user_id: subject.user_id,
              day: d,
              goal_id: CLOSED,
            },
          });
        }
      }
    }

    // ── money he condemned and has not placed ─────────────────────────────────
    //
    // "$X still to place" is the most honest line on the screen and nothing ever
    // acted on it. If it drifts to a couple of hundred, the bet pot stops meaning
    // anything, and then the only thing the feature still does to her is the guilt.
    for (const subject of subjects) {
      const { data: potsRow } = await admin.rpc('five_pots', {
        p_user: subject.user_id,
      });
      const pots = (potsRow ?? {}) as Record<string, number>;
      const owed = (pots.bet_cents ?? 0) - (pots.staked_cents ?? 0);
      if (owed < UNPLACED_CENTS) continue;
      pushes.push({
        to: keeper,
        tag: 'five-unplaced',
        title: `🎟️ ${money(owed)} still to place`,
        body: 'Her missed goals have been paid for and not bet yet. The pot only means something if you place them.',
        url: '/five',
        claim: {
          how: 'insert',
          user_id: subject.user_id,
          day: localDay(zoneOf(subject), now),
          goal_id: UNPLACED,
        },
      });
    }

    if (dryRun) {
      return json({
        dryRun: true,
        open: FIVE_OPEN,
        began,
        quieted,
        planned,
        settled,
        pushes: pushes.map((p) => ({
          to: p.to.display_name ?? p.to.role,
          tag: p.tag,
          title: p.title,
          body: p.body,
        })),
      });
    }

    let sent = 0;
    for (const item of pushes) {
      const { data: subs } = await admin
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', item.to.user_id);
      // No device to reach. Claiming it would burn the one chance we get to say
      // this, so leave the ledger alone and try again in ten minutes.
      if (!subs || subs.length === 0) continue;

      // Claim it BEFORE sending. Whichever shape it takes, the claim is a single
      // statement the database arbitrates, so two overlapping ticks can never
      // both speak: the loser gets no row back, and stays quiet.
      const { how, user_id, day, goal_id } = item.claim;
      if (how === 'stamp') {
        const { data: claimed } = await admin
          .from('five_reminders')
          .update({ sent_at: now.toISOString() })
          .eq('user_id', user_id)
          .eq('day', day)
          .eq('goal_id', goal_id)
          .is('sent_at', null)
          .select('goal_id');
        if (!claimed || claimed.length === 0) continue;
      } else {
        const { error: claim } = await admin.from('five_reminders').insert({
          user_id,
          day,
          goal_id,
          slot_at: now.toISOString(),
          sent_at: now.toISOString(),
        });
        if (claim) continue; // 23505 - already said. Either way: silence.
      }

      const message = JSON.stringify({
        title: item.title,
        body: item.body,
        url: item.url,
        tag: item.tag,
        vibrate: item.vibrate,
      });

      const dead: string[] = [];
      let delivered = 0;
      await Promise.all(
        subs.map(async (s) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: s.endpoint,
                keys: { p256dh: s.p256dh, auth: s.auth },
              },
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
        // Nothing landed. Give the next tick its turn rather than leaving a row
        // that says we warned someone we never warned.
        const undo = admin.from('five_reminders');
        if (how === 'stamp') {
          await undo
            .update({ sent_at: null })
            .eq('user_id', user_id)
            .eq('day', day)
            .eq('goal_id', goal_id);
        } else {
          await undo
            .delete()
            .eq('user_id', user_id)
            .eq('day', day)
            .eq('goal_id', goal_id);
        }
      }
      sent += delivered;
    }

    const cutoff = new Date(now.getTime() - PRUNE_DAYS * 86_400_000);
    await admin
      .from('five_reminders')
      .delete()
      .lt('day', cutoff.toISOString().slice(0, 10));

    return json({
      began: began.length,
      quieted: quieted.length,
      planned: planned.length,
      settled: settled.length,
      sent,
    });
  } catch (err) {
    // This job moves money on a schedule nobody is watching. A bare 500 says
    // only that something broke, three days after it started breaking - so it
    // says WHAT, to the one caller that can read it.
    console.error('five: ', err);
    return json(
      {
        error: 'tick failed',
        detail: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
});
