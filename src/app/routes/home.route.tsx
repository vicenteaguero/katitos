import { useState, type CSSProperties } from 'react';
import { Heart } from 'lucide-react';
import { usePartner } from '@kernel/auth';
import { useCouple } from '@kernel/couple';
import { useNow } from '@kernel/hooks';
import {
  cn,
  daysTogether,
  durationBreakdown,
  formatDistance,
  haversineKm,
  monthsversaryCount,
  timeInZone,
  type DurationParts,
} from '@kernel/lib';
import { notifyPartner } from '@kernel/push';
import { toast, useTopBarAction } from '@kernel/ui';
import { usePartnerPresence } from '@features/presence';
import { TodayQuestionsWidget } from '@features/know-me';
import { LastPolaroidWidget } from '@features/polaroid';
import { loveNoteFor, useLovePhrases } from '@features/love';
import { sendLoveBurst } from '../shell/love-channel';

/** Our pet names by role: him (a) is Katito, her (b) is Katita. */
function petNameOf(role: string | null | undefined): 'Katito' | 'Katita' {
  return role === 'a' ? 'Katito' : 'Katita';
}

/** Grammatical gender of a role for endearments (him → m, her → f). */
function genderOf(role: string | null | undefined): 'm' | 'f' {
  return role === 'a' ? 'm' : 'f';
}

/** "45 min ago" · "3 hrs ago" · "2 days ago" — always a whole number. */
function compactAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return 'moments ago';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

/** "2 years · 3 months · 1 week · 4 days", trimming leading zero units. */
function fmtBreakdown(b: DurationParts): string {
  const plural = (n: number, unit: string) =>
    `${n} ${unit}${n === 1 ? '' : 's'}`;
  const parts: string[] = [];
  if (b.years) parts.push(plural(b.years, 'year'));
  if (b.months) parts.push(plural(b.months, 'month'));
  if (b.weeks) parts.push(plural(b.weeks, 'week'));
  parts.push(plural(b.days, 'day'));
  return parts.join(' · ');
}

/**
 * Is it the monthsversary right now — for either of us?
 *
 * Deliberately the UNION of our two timezones, not `coupleDay`'s MIN: the day
 * we celebrate should be lit for both of us across the whole eleven-hour
 * spread, not blink out for one while the other is still in it.
 */
function useMonthsversary(): { count: number } | null {
  const { self, partner } = usePartner();
  const { data: couple } = useCouple();
  // Re-checked every minute so the banner actually appears at midnight instead
  // of waiting for the next navigation.
  const now = useNow(60_000);

  const target = couple?.anniversary_day ?? 15;
  const isDay = [self?.timezone, partner?.timezone].some((zone) => {
    if (!zone) return false;
    const local = now.setZone(zone);
    // Clamp for short months, matching nextMonthsversary()'s behaviour.
    const day = Math.min(target, local.daysInMonth ?? 28);
    return local.day === day;
  });
  if (!isDay) return null;

  return {
    count: couple?.relationship_start_date
      ? monthsversaryCount(couple.relationship_start_date, now)
      : 0,
  };
}

/**
 * Home — the "Bolshoi Nocturne" overture. Whether your love is here, the kept
 * hero (days together, both clocks, the leagues between), tonight's questions,
 * and the last photo you took.
 */

/** The greeting — about your love's presence, with a "loves you" pulse. */
function Greeting() {
  const { self, partner } = usePartner();
  const { online } = usePartnerPresence();
  const { data: phrases } = useLovePhrases();
  const partnerName = petNameOf(partner?.role);
  const [sent, setSent] = useState(false);

  const sendLove = async () => {
    if (sent) return; // debounce: ignore taps during the "sent" window
    setSent(true);
    // Only phrases addressed to the person receiving them. The old pool mixed
    // feminine-only lines in with the rest, so she kept sending him "любимая".
    const note =
      loveNoteFor(phrases ?? [], genderOf(partner?.role), partnerName) ??
      `I love you, ${partnerName} 💕`;
    // Play the on-screen love burst instantly (here) and on the partner's
    // screen (broadcast) — the native push below still fires for when their
    // app is closed.
    sendLoveBurst(note);
    // The push (for when their app is closed) now names the sender and carries
    // the sweet-nothing itself as the body — so the lock screen reads like a note.
    const fromName = petNameOf(self?.role);
    const { ok, delivered } = await notifyPartner({
      kind: 'love',
      title: `💌 from ${fromName}`,
      body: note,
      url: '/',
    });
    if (!ok) {
      toast.error("Couldn't send — try again");
      setSent(false);
      return;
    }
    // The call succeeded but reached no device — the partner hasn't enabled
    // notifications yet, so be honest instead of claiming it was delivered.
    if (delivered === 0) {
      toast.info(`Sent — ask ${partnerName} to turn on notifications 🔔`);
      setSent(false);
      return;
    }
    toast.success('Sent 💌');
    window.setTimeout(() => setSent(false), 2200);
  };

  // On the 15th — in EITHER of our timezones, so it shows across both our
  // days — the presence line gives way to the monthsversary.
  const monthsversary = useMonthsversary();

  // The presence one-liner lives in the top bar now (out of the hero).
  // Note there is no "is away" fallback any more: when we have nothing kind to
  // report, we say nothing.
  useTopBarAction(
    monthsversary ? (
      <span className="truncate font-sans text-xs text-gold">
        <span className="candle-flicker mr-1" aria-hidden="true">
          ❤️‍🩹
        </span>
        Happy Monthversary my{' '}
        <span className="font-semibold">{partnerName}</span>!
        {monthsversary.count > 0 && (
          <span className="ml-1 text-muted">
            · {monthsversary.count} months
          </span>
        )}
      </span>
    ) : online ? (
      <span className="truncate font-sans text-xs text-muted">
        <span className="font-semibold text-fg">{partnerName}</span> is here now
      </span>
    ) : partner?.last_seen_at ? (
      <span className="truncate font-sans text-xs text-muted">
        <span className="font-semibold text-fg">{partnerName}</span> was here{' '}
        {compactAgo(partner.last_seen_at)}
      </span>
    ) : null,
    [partnerName, online, partner?.last_seen_at, monthsversary?.count]
  );

  return (
    <header className="flex flex-col items-center text-center">
      {/* The hero CTA — gilt-rimmed, softly haloed, a beating heart. */}
      <div className="relative inline-flex">
        <span
          aria-hidden="true"
          className="love-halo pointer-events-none absolute -inset-1 -z-10 rounded-full bg-accent/45 blur-lg"
        />
        <button
          type="button"
          onClick={() => void sendLove()}
          disabled={sent}
          className="btn-catchlight lift-press relative inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3 font-sans text-[0.95rem] font-semibold text-accent-fg shadow-loge disabled:opacity-100"
          style={{ border: '1px solid rgba(201,162,75,.5)' }}
        >
          <Heart
            size={16}
            className={cn(
              'fill-current',
              sent ? 'candle-flicker' : 'heart-beat'
            )}
          />
          {sent ? 'Love sent 💌' : 'Send love'}
        </button>
      </div>
    </header>
  );
}

/**
 * The Novosibirsk Opera (NOVAT) — the couple's hand-painted stained-glass
 * emblem, floated over a soft, slowly-breathing gilt aura so it feels lit.
 */
function SilverDome() {
  return (
    <div className="relative isolate mx-auto mt-5 w-[232px]">
      {/* A SQUARE box so the circle fades out before every edge — the old
          non-square box left the glow uncovered at the top/bottom edges and
          clipped it into a hard rectangle. Stays BEHIND the image (earlier in
          the DOM, so the building paints on top). */}
      {/* Outer span does the centering (static translate); the inner .love-halo
          only animates SCALE — otherwise the keyframe's `transform` overrides
          the centering translate and the halo drifts off the emblem's centre. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2"
      >
        <span
          className="love-halo block h-full w-full rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(228,195,106,0.36) 0%, rgba(228,195,106,0.12) 38%, transparent 64%)',
          }}
        />
      </span>
      <img
        src="/novat.png"
        alt="The Novosibirsk Opera"
        className="relative mx-auto w-full drop-shadow-[0_10px_22px_rgba(0,0,0,0.5)]"
      />
    </div>
  );
}

/** A single person's clock column. */
function Clock({
  label,
  time,
  align,
  her,
}: {
  label: string;
  time: string;
  align: 'left' | 'right';
  her?: boolean;
}) {
  return (
    <div className={align === 'right' ? 'text-right' : 'text-left'}>
      <p className="m-0 text-[10.5px] text-[#c2a3ab]">{label}</p>
      <p
        className={`m-0 mt-1 font-display text-2xl font-semibold tabular-nums ${
          her ? 'text-[#f0b8c4]' : 'text-fg'
        }`}
      >
        {time}
      </p>
    </div>
  );
}

/** THE KEPT HERO — together for N days, crowned by the dome, clocks + leagues. */
function TogetherHero() {
  const { self, partner } = usePartner();
  const { data: couple } = useCouple();
  const now = useNow(30_000);

  if (!self || !partner) return null;
  const days = daysTogether(couple?.relationship_start_date);
  const breakdown = durationBreakdown(couple?.relationship_start_date);

  const km =
    self.lat != null &&
    self.lng != null &&
    partner.lat != null &&
    partner.lng != null
      ? haversineKm(
          { lat: self.lat, lng: self.lng },
          { lat: partner.lat, lng: partner.lng }
        )
      : null;

  return (
    <div
      className="relative mt-6 overflow-hidden rounded"
      style={{
        // Gilt hairline as a 1px gradient frame that FOLLOWS the corner radius
        // (border-image ignores border-radius — this nests a dark panel inside
        // a gilt-gradient pad instead, so the gold corners are smooth too).
        background:
          'linear-gradient(150deg,#8a6c28,#e4c36a 42%,#fff1c9 50%,#e4c36a 58%,#8a6c28)',
        padding: '1px',
        boxShadow: '0 26px 50px -26px rgba(0,0,0,.8)',
      }}
    >
      <div
        className="relative overflow-hidden rounded text-center"
        style={{
          background:
            'radial-gradient(70% 40% at 50% 102%, rgba(201,162,75,.14), transparent 70%), radial-gradient(90% 55% at 50% -8%, rgba(196,200,213,.12), transparent 60%), linear-gradient(168deg, #3a0d1a 0%, #220812 52%, #130407 100%)',
          boxShadow: 'inset 0 2px 0 rgba(255,241,201,.18)',
          paddingBottom: '24px',
        }}
      >
        <SilverDome />
        <span
          className="kx-glow pointer-events-none absolute bottom-0 left-1/2 h-[90px] w-[220px]"
          style={{
            background:
              'radial-gradient(circle at 50% 100%, rgba(201,162,75,.22), transparent 70%)',
          }}
          aria-hidden="true"
        />
        {/* hero body */}

        <div className="relative px-[22px]">
          <p className="m-0 mt-2.5 text-[10.5px] font-bold uppercase tracking-[0.3em] text-[#c89aa6]">
            Together for
          </p>
          <p className="gilt-text gold-shimmer gilt-figures m-0 font-display text-[5.6rem] font-semibold tracking-tight">
            {days.toLocaleString()}
          </p>
          {/* The same span, decomposed — calendar years / months / weeks / days. */}
          <p className="m-0 font-sans text-[10.5px] uppercase tracking-[0.16em] text-[#b08e95]">
            {fmtBreakdown(breakdown)}
          </p>

          <div className="my-5 flex items-center justify-center gap-3">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[rgba(201,162,75,0.5)]" />
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#c9a24b]">
              <span className="h-1 w-1 rounded-full bg-[#eaf2ff] shadow-[0_0_6px_1px_rgba(234,242,255,0.7)]" />
            </span>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[rgba(201,162,75,0.5)]" />
          </div>

          <div className="flex items-center justify-between gap-2">
            <Clock
              align="left"
              label={self.city ?? '—'}
              time={self.timezone ? timeInZone(self.timezone, now) : '—'}
            />
            <div className="text-center">
              <svg
                width="46"
                height="14"
                viewBox="0 0 46 14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 7h40"
                  stroke="rgba(201,162,75,.45)"
                  strokeWidth="1.2"
                  strokeDasharray="2 3"
                />
                <path
                  d="M40 3l5 4-5 4"
                  stroke="rgba(201,162,75,.45)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="m-0 mt-1 text-[10px] tracking-wide text-[#9c7d84]">
                {km != null ? formatDistance(km) : '—'}
              </p>
            </div>
            <Clock
              align="right"
              her
              label={partner.city ?? '—'}
              time={partner.timezone ? timeInZone(partner.timezone, now) : '—'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomeRoute() {
  return (
    <div
      className="curtain-reveal space-y-5"
      style={{ '--i': 0 } as CSSProperties}
    >
      <Greeting />
      <TogetherHero />
      <TodayQuestionsWidget />
      <LastPolaroidWidget />
    </div>
  );
}
