// The clock behind Habits.
//
// Called every ten minutes by pg_cron (see 20260926000004). Sibling of
// polaroid-reminder, and for the same reason: this pushes because a phone
// DIDN'T do something, so no phone is awake to notice and the decision has to
// be made here. It also settles the money, for the same reason - a day closes
// at an hour when nobody is looking.
//
// One clock for one feature. There used to be two, one for the streak and one
// for the money, reading the same habits ten minutes apart.
//
// Two nudges, each at most once ever, per person, per day:
//
//   day_end    3h before midnight where YOU are, if anything of yours for
//              today is still unticked.
//   last_call  1h before a past day stops being fixable. The window closes
//              when the clock BEHIND passes the end of the day after it, which
//              is 23:00 for him and mid-morning for her - so this one is
//              genuinely the last chance.
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
import {
  DAY_FROM,
  DAY_TO,
  NUDGES_ON,
  fixedFor,
  lineOf,
  nudgeFor,
} from '../_shared/habits.ts';

/**
 * Fire the end-of-day nudge with this much of your own day left.
 *
 * Two hours, not three, because polaroid-reminder fires at exactly three and
 * the two crons are five minutes apart: she was going to get "3 hours of
 * Saturday left" and "3 hours left today" back to back, every evening.
 */
const DAY_END_MS = 2 * 60 * 60 * 1000;
/** Fire the last call with this much of the grace window left. */
const LAST_CALL_MS = 60 * 60 * 1000;
/** Reminders older than this are bookkeeping nobody will ever read. */
const PRUNE_DAYS = 30;
/** How far back the money will go looking for a day nobody settled. */
const CLOSE_LOOKBACK_DAYS = 7;
/** This many silent closed days in a row and the money switches itself off. */
const QUIET_DAYS = 3;
/** Condemned and not yet put on a match, before he is chased about it. */
const UNPLACED_CENTS = 100;
/** A match is over, and the result askable, this long after it starts. */
const PLAYED_MS = 2 * 60 * 60 * 1000;
/** A nudge planned more than this long ago is stale; the day moved on. */
const STALE_MS = 4 * 60 * 60 * 1000;

/**
 * What a push is about.
 *
 * Free text now rather than two values: the streak's two nudges, a day that
 * closed with money on it, a silent stretch, bets he has not placed, and one
 * about a single habit. They all claim their one chance in the same ledger.
 */
type Kind = string;

interface Member {
  user_id: string;
  role: string | null;
  timezone: string | null;
  is_admin: boolean | null;
  display_name: string | null;
}

interface Habit {
  id: string;
  user_id: string | null;
  kind: string;
  schedule: string;
  title: string;
  emoji: string;
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

/** Dollars, the way a notification should say them: $9, never $9.00. */
function dollars(cents: number): string {
  const d = cents / 100;
  return `$${Number.isInteger(d) ? d : d.toFixed(2)}`;
}

/** Pesos, the way Chile writes them: 9.500 CLP. The bets are placed in these. */
function pesos(clp: number): string {
  return `${Math.round(clp).toLocaleString('es-CL')} CLP`;
}

/** The Monday of the week an ISO date falls in. */
function mondayOf(isoDay: string): string {
  const d = new Date(`${isoDay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function activeOn(h: Habit, day: string): boolean {
  if (day < h.effective_from) return false;
  if (h.archived_at && day >= h.archived_at.slice(0, 10)) return false;
  return true;
}

async function tick(req: Request): Promise<Response> {
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
    .select('user_id, role, timezone, is_admin, display_name');
  if (!members || members.length === 0) return json({ sent: 0, due: 0 });

  // Archived ones INCLUDED. A day is judged against the habits that were in
  // force on it, and `activeOn` below applies exactly that rule per day - the
  // same one `money_habits()` applies in the database. Filtering them out here
  // meant that putting a habit away on Monday quietly rewrote Sunday's money,
  // and made the two writers of the ledger disagree about the same day.
  const { data: habits } = await admin
    .from('habits')
    .select(
      'id, user_id, kind, schedule, title, emoji, effective_from, archived_at'
    );
  const daily = ((habits ?? []) as Habit[]).filter(
    (h) => h.schedule === 'daily'
  );

  // Every date either of us could still be ticking: our two current dates, and
  // the day before each of them, which the grace window keeps open. The oldest
  // of those is the only one that can be about to close.
  const yesterdayOf = (day: string) =>
    new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000)
      .toISOString()
      .slice(0, 10);
  const todays = (members as Member[]).map((m) => localDay(zoneOf(m), now));
  const lookup = [...new Set([...todays, ...todays.map(yesterdayOf)])].sort();

  const { data: entries } = await admin
    .from('habit_entries')
    .select('habit_id, day')
    .is('revoked_at', null)
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
   * A day is open while the clock behind has not passed the end of the day
   * after it - so it closes the moment the LAST of us reaches that point.
   */
  const closesAt = (day: string) =>
    Math.max(
      ...(members as Member[]).map((m) =>
        startOfDay(zoneOf(m), nextDay(nextDay(day))).getTime()
      )
    );

  // ── who the money is on, and the one thing that silences her phone ──────
  //
  // Hoisted above the nudges deliberately. A hard day is HER valve, and the two
  // pushes below name every habit she has not ticked - which on the day she has
  // said she cannot do is the exact message this feature exists not to send.
  // They used to be built three hundred lines before anything here knew what a
  // hard day was.
  const keeper = (members as Member[]).find((m) => m.is_admin) ?? null;
  const subject = (members as Member[]).find((m) => !m.is_admin) ?? null;
  /** The clock behind: the earliest date either of them is living right now. */
  const nearest = todays.reduce((a, b) => (a < b ? a : b));
  /** A day is final once the day after it is behind the slower clock. */
  const isDayFinal = (day: string) => nextDay(day) < nearest;

  const subjectToday = subject
    ? localDay(zoneOf(subject), now)
    : lookup[lookup.length - 1];
  /** As far back as the money ever looks: a week of closes, plus one. */
  const moneyFrom = (() => {
    let d = subjectToday;
    for (let i = 0; i < CLOSE_LOOKBACK_DAYS + 1; i++) d = yesterdayOf(d);
    return d;
  })();

  const hardRows = subject
    ? (
        await admin
          .from('hard_days')
          .select('day, hard_day')
          .eq('user_id', subject.user_id)
          .gte('day', moneyFrom)
      ).data
    : null;
  const isHard = (day: string) =>
    (hardRows ?? []).some((d) => d.day === day && d.hard_day);
  /** Nothing more is asked of a day she has called hard. Not one push. */
  const resting = (m: Member, day: string) =>
    !!subject && m.user_id === subject.user_id && isHard(day);

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
    if (todo.length > 0 && !resting(member, today)) {
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
    // For him that is yesterday; for her, a day ahead, it is the day before.
    const closing = lookup[0];
    const late = owed(member, closing);
    if (late.length > 0 && !resting(member, closing)) {
      const left = closesAt(closing) - now.getTime();
      if (left > 0 && left <= LAST_CALL_MS) {
        due.push({
          member,
          kind: 'last_call',
          day: closing,
          title:
            closing === yesterdayOf(today)
              ? `🌙 Last chance for yesterday`
              : `🌙 Last chance for ${new Date(`${closing}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })}`,
          body: `${timeLeft(left)} to tick ${late.join(', ')} before it closes for ${theirName} too.${run}`,
        });
      }
    }
  }

  // ══ the money ═══════════════════════════════════════════════════════════
  //
  // Her habits, and only hers, carry a dollar when she holds one and three when
  // she does not. It is his money either way. Everything below happens at the
  // close of a day, which is an hour when nobody is looking at a phone, which
  // is why it lives in the clock and not in the app.
  const settled: Record<string, unknown>[] = [];
  const quieted: string[] = [];
  const planned: Record<string, string>[] = [];

  if (subject && keeper) {
    const zone = zoneOf(subject);
    const herToday = subjectToday;
    const from = moneyFrom;

    // Her row, created the first time the clock sees her. `started_on` defaults
    // to today in the database, so the first day is the first day and every day
    // before it stays outside - she is not billed for the week before this
    // existed.
    let { data: settings } = await admin
      .from('money_settings')
      .select('gift_cents, bet_cents, active, started_on')
      .eq('user_id', subject.user_id)
      .maybeSingle();
    if (!settings && !dryRun) {
      await admin
        .from('money_settings')
        .insert({ user_id: subject.user_id, started_on: herToday });
      const again = await admin
        .from('money_settings')
        .select('gift_cents, bet_cents, active, started_on')
        .eq('user_id', subject.user_id)
        .maybeSingle();
      settings = again.data;
    }

    if (settings?.active) {
      const giftCents = settings.gift_cents ?? 100;
      const betCents = settings.bet_cents ?? 300;
      const startedOn = settings.started_on ?? herToday;

      /** Her habits, as the money counts them: personal, daily, in force. */
      const hersOn = (day: string) =>
        daily.filter(
          (h) =>
            h.kind === 'personal' &&
            h.user_id === subject.user_id &&
            activeOn(h, day)
        );

      const { data: herEntries } = await admin
        .from('habit_entries')
        .select('habit_id, day, revoked_at')
        .in(
          'habit_id',
          hersOn(herToday).map((h) => h.id)
        )
        .gte('day', from);
      const { data: ledger } = await admin
        .from('money_ledger')
        .select('day')
        .eq('user_id', subject.user_id)
        .not('habit_id', 'is', null)
        .gte('day', from);
      const { data: pauses } = await admin
        .from('money_pauses')
        .select('from_day, to_day')
        .eq('user_id', subject.user_id)
        .or(`to_day.is.null,to_day.gte.${from}`);
      const { data: nudges } = await admin
        .from('habit_nudges')
        .select('day, kind, slot_at, sent_at')
        .eq('user_id', subject.user_id)
        .gte('day', from);

      const held = (habitId: string, day: string) =>
        (herEntries ?? []).some(
          (e) => e.habit_id === habitId && e.day === day && !e.revoked_at
        );
      const isSettled = (day: string) =>
        (ledger ?? []).some((l) => l.day === day);
      const pausedOn = (day: string) =>
        (pauses ?? []).some(
          (p) => p.from_day <= day && (!p.to_day || p.to_day >= day)
        );
      const nudge = (day: string, kind: string) =>
        (nudges ?? []).find((n) => n.day === day && n.kind === kind);

      // ── has she gone quiet? ─────────────────────────────────────────────
      //
      // A silent stretch is the symptom, not laziness, and the right answer is
      // to stop the meter and tell HIM - not to keep charging fifteen a day and
      // keep buzzing her about it.
      //
      // It walks back PAST the days that are still open. It used to break on
      // the first one, and the first one is always her yesterday, which is
      // never final yet - so `closedDays` was always empty, `silent` was always
      // false, and the brake that was supposed to stop the meter during a bad
      // stretch had never once been able to fire.
      const closedDays: string[] = [];
      for (
        let d = yesterdayOf(herToday), guard = 0;
        guard < CLOSE_LOOKBACK_DAYS + 2 && closedDays.length < QUIET_DAYS;
        guard++, d = yesterdayOf(d)
      ) {
        if (d <= startedOn) break;
        if (!isDayFinal(d)) continue;
        closedDays.push(d);
      }
      const silent =
        closedDays.length === QUIET_DAYS &&
        closedDays.every(
          (d) =>
            !isHard(d) && !pausedOn(d) && hersOn(d).every((h) => !held(h.id, d))
        );

      if (silent) {
        quieted.push(closedDays[closedDays.length - 1]);
        if (!dryRun) {
          await admin
            .from('money_settings')
            .update({ active: false })
            .eq('user_id', subject.user_id);
          await admin
            .from('money_pauses')
            .update({ reason: 'quiet' })
            .eq('user_id', subject.user_id)
            .is('to_day', null);
        }
        due.push({
          member: keeper,
          kind: 'quiet',
          day: herToday,
          title: '🤍 Three quiet days',
          body: `Nothing ticked since ${closedDays[closedDays.length - 1]}. The money is off and nothing is being charged. Ring her.`,
        });
      } else {
        // ── close every day that is over for both of us ───────────────────
        // One summary a tick, however many days are owed: a backlog is a clock
        // that was down, not several things he needs to hear about at once.
        let told = false;
        for (
          let d = yesterdayOf(herToday), i = 0;
          i < CLOSE_LOOKBACK_DAYS;
          i++, d = yesterdayOf(d)
        ) {
          if (d <= startedOn) break;
          if (isSettled(d)) continue;
          if (!isDayFinal(d)) continue;
          if (pausedOn(d)) {
            settled.push({ day: d, paused: true });
            continue;
          }

          const hers = hersOn(d);
          if (hers.length === 0) continue; // nothing was asked of her that day

          const hard = isHard(d);
          const done = hers.filter((h) => held(h.id, d));
          const missed = hers.filter((h) => !held(h.id, d));
          const gift = done.length * giftCents;
          const bet = hard ? 0 : missed.length * betCents;
          settled.push({ day: d, done: done.length, gift, bet, hardDay: hard });

          if (!dryRun) {
            // A hard day forgives the misses and keeps every dollar she held.
            const rows = hers
              .filter((h) => held(h.id, d) || !hard)
              .map((h) => ({
                user_id: subject.user_id,
                day: d,
                habit_id: h.id,
                direction: held(h.id, d) ? 'gift' : 'bet',
                amount_cents: held(h.id, d) ? giftCents : betCents,
                reason: held(h.id, d) ? 'done' : 'missed',
              }));
            if (rows.length > 0) {
              // The unique index is the rule: two overlapping ticks both reach
              // this line and exactly one set of rows lands.
              const { error } = await admin.from('money_ledger').insert(rows);
              if (error) {
                settled.pop();
                continue;
              }
            }
          }

          if (!told && !nudge(d, '_closed')) {
            told = true;
            due.push({
              member: keeper,
              kind: 'closed',
              day: d,
              title: hard
                ? 'Habits: a hard day'
                : `Habits: ${done.length} of ${hers.length}`,
              body: hard
                ? `She called it a hard day, and it cost nothing. ${dollars(gift)} to her gift. Ring her.`
                : `${dollars(gift)} to her gift, ${dollars(bet)} to the betting money.`,
            });
          }
        }

        // ── her own nudges, when he has switched them on ──────────────────
        if (NUDGES_ON && !isHard(herToday)) {
          const hers = hersOn(herToday);
          const dayStart = startOfDay(zone, herToday).getTime();
          // Random, but not independently random: five free draws clump, and
          // three reminders inside ten minutes is a phone going off, not a day
          // with reminders in it. One stretch each, shuffled daily.
          // Sleep and eating keep their own hours (FIXED_NUDGES); only the
          // rest share out the day at random.
          const order = hers.filter((h) => !fixedFor(h.title));
          for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
          }
          const band = (DAY_TO - DAY_FROM) / Math.max(1, order.length);

          for (const [stretch, habit] of order.entries()) {
            if (nudge(herToday, habit.id)) continue;
            const at =
              dayStart +
              (DAY_FROM + stretch * band + Math.random() * band) * 3_600_000;
            if (at < now.getTime() - STALE_MS) continue;
            planned.push({
              habit: habit.title,
              at: new Date(at).toISOString(),
            });
            if (!dryRun) {
              await admin.from('habit_nudges').insert({
                user_id: subject.user_id,
                day: herToday,
                kind: habit.id,
                slot_at: new Date(at).toISOString(),
              });
            }
          }

          for (const habit of hers) {
            for (const f of fixedFor(habit.title) ?? []) {
              const at = dayStart + f.hour * 3_600_000;
              if (at > now.getTime() || at < now.getTime() - STALE_MS) continue;
              if (f.ifUndone && held(habit.id, herToday)) continue;
              due.push({
                member: subject,
                kind: `habit:${habit.id}@${f.hour}`,
                day: herToday,
                title: f.title,
                body: lineOf(f),
              });
            }
          }

          for (const habit of order) {
            const row = nudge(herToday, habit.id);
            if (!row || row.sent_at) continue;
            const at = new Date(row.slot_at).getTime();
            if (at > now.getTime()) continue;
            // A nudge that waited out an outage is not delivered at the wrong
            // hour: "anything counts today" at eight in the evening is a
            // different sentence.
            if (at < now.getTime() - STALE_MS) continue;
            if (held(habit.id, herToday)) continue;
            due.push({
              member: subject,
              kind: `habit:${habit.id}`,
              day: herToday,
              title: `${habit.emoji} ${habit.title}`,
              body: nudgeFor(habit.title, habit.emoji),
            });
          }
        }
      }
    }

    // ── money he condemned and has not placed ───────────────────────────
    //
    // "$X still to place" is the most honest line on the page, and nothing ever
    // acted on it. The betting money is a week now: whatever her misses burned
    // between Monday and Sunday is a bet he owes, so once a week, on his Monday,
    // he is told the figure. Once only - the ledger below claims it by that
    // Monday's date.
    const { data: potsRow } = await admin.rpc('money_pots', {
      p_user: subject.user_id,
    });
    const pots = (potsRow ?? {}) as Record<string, number>;
    const owedNow = (pots.bet_cents ?? 0) - (pots.staked_cents ?? 0);
    const monday = mondayOf(localDay(zoneOf(keeper), now));
    if (owedNow >= UNPLACED_CENTS) {
      due.push({
        member: keeper,
        kind: 'unplaced',
        day: monday,
        title: `🎟️ ${dollars(owedNow)} still to place`,
        body: 'Her missed habits have been paid for and not bet yet. The money only means something if you put it on something.',
      });
    }

    // ── a match that has been played and never settled ──────────────────
    //
    // He logs one on Monday for a match on Thursday morning, and the result only
    // ever got filled in if he happened to open the page and remember. A log
    // with holes in it is the one thing this log cannot be, so two hours after
    // kickoff it asks him, and asks again tomorrow until it is settled or void.
    const { data: riding } = await admin
      .from('bets')
      .select('id, pick, stake_cents, stake_clp, odds, kickoff, status')
      .eq('status', 'open')
      .not('kickoff', 'is', null)
      .lt('kickoff', new Date(now.getTime() - PLAYED_MS).toISOString());
    for (const bet of riding ?? []) {
      // What he actually put on it. The dollars are only the pot's bookkeeping.
      const stake = bet.stake_clp ?? Math.round((bet.stake_cents / 100) * 950);
      const back = bet.odds
        ? ` ${pesos(Math.round(stake * Number(bet.odds)))} if it came in.`
        : '';
      due.push({
        member: keeper,
        kind: `bet:${bet.id}`,
        day: localDay(zoneOf(keeper), now),
        title: '🎟️ How did it go?',
        body: `${bet.pick}, ${pesos(stake)}.${back} Put the result in - a win goes straight to her gift.`,
      });
    }
  }

  // Not a word to her until he has told her himself. Every nudge names her
  // habits, so the first she hears of them would be a lock screen at eleven at
  // night. Dropped here rather than at the send, so a dry run says exactly what
  // a real tick would do.
  const muted = NUDGES_ON
    ? []
    : due.filter((d) => !d.member.is_admin).map((d) => d.kind);
  const toSend = NUDGES_ON ? due : due.filter((d) => d.member.is_admin);

  if (dryRun) {
    return json({
      dryRun: true,
      muted,
      streak: runningDays,
      settled,
      quieted,
      planned,
      due: toSend.map((d) => ({
        who: d.member.role,
        kind: d.kind,
        day: d.day,
        title: d.title,
        body: d.body,
      })),
    });
  }

  let sent = 0;
  for (const item of toSend) {
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
      url: '/habits',
      tag: `habits-${item.kind}`,
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

  return json({
    due: toSend.length,
    muted: muted.length,
    sent,
    streak: runningDays,
  });
}

/**
 * One envelope around the lot.
 *
 * pg_cron calls this every ten minutes and reads nothing back, so a throw in
 * here is a clock that silently stopped: no day settles, no money moves, nobody
 * is told anything, and the only symptom is an app that looks fine. It has
 * happened once already, from a function name that was deleted and still called.
 * Now it answers with the reason, which a dry run and the function logs both
 * show.
 */
Deno.serve(async (req) => {
  try {
    return await tick(req);
  } catch (err) {
    console.error('habits-tick failed', err);
    return json(
      {
        error: 'tick failed',
        detail: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
});
