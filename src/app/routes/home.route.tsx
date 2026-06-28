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
  timeInZone,
  type DurationParts,
} from '@kernel/lib';
import { notifyPartner } from '@kernel/push';
import { toast } from '@kernel/ui';
import { usePartnerPresence } from '@features/presence';
import { SummerCountdownWidget } from '@features/summer';
import { TodayQuestionsWidget } from '@features/know-me';
import { LastPolaroidWidget } from '@features/polaroid';
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

/**
 * Twenty sweet-nothings, agreement-matched to the partner's gender. One is
 * picked at random each time you send love, so the ping is never the same twice.
 */
function loveNotes(name: string, g: 'm' | 'f'): string[] {
  const pol = g === 'f' ? 'polola' : 'pololo';
  // his line for her: polola/katita + bonita/guapa/hermosa/preciosa/linda
  const adj =
    g === 'f'
      ? ['bonita', 'guapa', 'hermosa', 'preciosa', 'linda']
      : ['bonito', 'guapo', 'hermoso', 'precioso', 'lindo'];
  const beloved = g === 'f' ? 'любимая' : 'любимый'; // Cyrillic "beloved"
  return [
    // — our words, kept in their own tongue —
    'Liubimonkey 🐵❤️',
    'любиминки 🤍',
    'Liubimonkeykaya 🥰',
    'Liubimonkeykayita 💞',
    `${beloved} 🤍`,
    'My sunshine ☀️',
    `Mi ${pol} ${adj[0]} ❤️`,
    `${name} ${adj[1]} 🌙`,
    `Mi ${pol} ${adj[2]} 🌹`,
    `${name} ${adj[3]} ✨`,
    `Mi ${name} ${adj[4]} 😍`,
    // — everything else in English, the way we actually talk —
    `I love you, ${name} 💕`,
    'You’re the love of my life 💖',
    'Thinking of you 💭',
    'Miss you across the miles 🌍',
    'Counting down to you 📆',
    'Can’t stop thinking about you 🤍',
    'Close even when you’re far 🩵',
    'I love you more every day 💞',
    'Sending you a kiss 😘',
    `You’re my home, ${name} 🏡`,
    `My love, my ${name} 💝`,
    `${name}, you’re my everything 🌟`,
  ];
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
 * Home — the "Bolshoi Nocturne" overture. Whether your love is here, the kept
 * hero (days together, both clocks, the leagues between), the Georgia
 * countdown, tonight's questions, and the last photo you took.
 */

/** The greeting — about your love's presence, with a "loves you" pulse. */
function Greeting() {
  const { self, partner } = usePartner();
  const { online } = usePartnerPresence();
  const partnerName = petNameOf(partner?.role);
  const [sent, setSent] = useState(false);

  const sendLove = async () => {
    if (sent) return; // debounce: ignore taps during the "sent" window
    setSent(true);
    const notes = loveNotes(partnerName, genderOf(partner?.role));
    const note = notes[Math.floor(Math.random() * notes.length)];
    // Play the on-screen love burst instantly (here) and on the partner's
    // screen (broadcast) — the native push below still fires for when their
    // app is closed.
    sendLoveBurst(note);
    // The push (for when their app is closed) now names the sender and carries
    // the sweet-nothing itself as the body — so the lock screen reads like a note.
    const fromName = petNameOf(self?.role);
    const { ok, delivered } = await notifyPartner({
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

  return (
    <header className="flex flex-col items-center text-center">
      {/* One quiet line: who, and how lately they were here. */}
      <p className="flex items-center justify-center gap-1.5 font-sans text-[0.92rem] text-muted">
        <span
          className={cn(
            'inline-block h-[7px] w-[7px] shrink-0 rounded-full',
            online ? 'candle-flicker bg-purple' : 'bg-muted'
          )}
          style={
            online
              ? { boxShadow: '0 0 8px 1px rgba(44,138,94,0.6)' }
              : undefined
          }
          aria-hidden="true"
        />
        Your <span className="font-semibold text-fg">{partnerName}</span>{' '}
        {online
          ? 'is here now ✨'
          : partner?.last_seen_at
            ? `was here ${compactAgo(partner.last_seen_at)}`
            : 'is away right now'}
      </p>

      {/* The hero CTA — gilt-rimmed, softly haloed, a beating heart. */}
      <div className="relative mt-4 inline-flex">
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

/** The silver dome of the Novosibirsk theatre — the crown of the kept hero. */
function SilverDome() {
  return (
    <div className="relative mx-auto mt-7 h-[70px] w-[138px]">
      <span className="absolute left-1/2 top-[-10px] h-[7px] w-[7px] -translate-x-1/2 rounded-full bg-[#eaf2ff] shadow-[0_0_12px_3px_rgba(234,242,255,0.7)]" />
      <span className="absolute left-1/2 top-[-4px] h-[14px] w-[2px] -translate-x-1/2 bg-gradient-to-b from-gold to-[#9c7a2e]" />
      <span
        className="absolute inset-0 border-[1.5px] border-b-0 border-[#c9a24b]"
        style={{
          borderRadius: '138px 138px 0 0',
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(0,0,0,.18) 0 1px, transparent 1px 12px), radial-gradient(120% 150% at 50% 100%, #d2d6dc 0%, #aeb4bc 36%, #777d86 70%, #545a62 100%)',
          boxShadow:
            'inset 0 4px 7px rgba(255,255,255,.28), 0 -2px 12px rgba(201,162,75,.22)',
        }}
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
          <p className="m-0 mt-5 text-[10.5px] font-bold uppercase tracking-[0.3em] text-[#c89aa6]">
            Together for
          </p>
          <p className="gilt-text gold-shimmer gilt-figures m-0 mt-1 font-display text-[5.6rem] font-semibold tracking-tight">
            {days.toLocaleString()}
          </p>
          {/* The same span, decomposed — calendar years / months / weeks / days. */}
          <p className="m-0 mt-2.5 font-sans text-[10.5px] uppercase tracking-[0.16em] text-[#b08e95]">
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
      <SummerCountdownWidget />
      <TodayQuestionsWidget />
      <LastPolaroidWidget />
    </div>
  );
}
