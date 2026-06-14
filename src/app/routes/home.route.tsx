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
  relativeTime,
  timeInZone,
  type DurationParts,
} from '@kernel/lib';
import { notifyPartner } from '@kernel/push';
import { toast } from '@kernel/ui';
import { usePartnerPresence } from '@features/presence';
import { CurrencyWidget } from '@features/currency';
import { GeorgiaCountdownWidget } from '@features/georgia';
import { TodayQuestionsWidget } from '@features/know-me';
import { LastPolaroidWidget } from '@features/polaroid';

/** Our pet names by role: him (a) is Katito, her (b) is Katita. */
function petNameOf(role: string | null | undefined): 'Katito' | 'Katita' {
  return role === 'a' ? 'Katito' : 'Katita';
}

/** Grammatical gender of a role for endearments (him → m, her → f). */
function genderOf(role: string | null | undefined): 'm' | 'f' {
  return role === 'a' ? 'm' : 'f';
}

/**
 * Twenty sweet-nothings, agreement-matched to the partner's gender. One is
 * picked at random each time you send love, so the ping is never the same twice.
 */
function loveNotes(name: string, g: 'm' | 'f'): string[] {
  const o = g === 'f' ? 'a' : 'o'; // adjective ending: hermosa/hermoso…
  return [
    `Te amo, ${name} 💕`,
    `Mi ${g === 'f' ? 'polola' : 'pololo'} hermos${o} ❤️`,
    `Eres el amor de mi vida 💖`,
    `${name} bonit${o}, te extraño 🌙`,
    `Mi cuteti${g === 'f' ? 'ta' : 'to'} lind${o} 🥰`,
    `Pienso en ti, ${name} 💭`,
    `Te mando un besito 😘`,
    `Mi amor, ven a casa 💌`,
    `No dejo de pensar en ti 🤍`,
    `Eres mi personita favorita ✨`,
    `Te amo más que ayer ❤️‍🔥`,
    `Mi ${name} precios${o} 🌹`,
    `Cada día te amo más 💞`,
    `Te necesito cerquita 🫶`,
    `My love, my ${name} 💝`,
    `Eres mi hogar, ${name} 🏡`,
    `Mi ${g === 'f' ? 'reina' : 'rey'} 👑`,
    `Te adoro, ${name} 😍`,
    `Mi corazón es tuyo 🤎`,
    `${name}, eres todo para mí 🌟`,
  ];
}

/**
 * Twenty closing lines for the "together for N days" hero — the bit after the
 * grand numeral. Rotates by day count, so it's stable through the day and turns
 * a new phrase each morning (no flicker on the 30s clock re-render).
 */
const TOGETHER_LINES = [
  'days — and every one a gift',
  'days, and I’d choose you in all of them',
  'days of you and me',
  'days woven into us',
  'days, still my favourite story',
  'days and counting, my love',
  'days that made us, us',
  'days I would live again',
  'days of coming home to you',
  'days, and the best is now',
  'days under the same sky',
  'days, never enough of you',
  'days the heart kept',
  'days, and I still pick you',
  'days against the distance',
  'days, every dawn yours',
  'days written in gold',
  'days, and forever to go',
  'days — luckiest of my life',
  'days, my whole heart',
];

/** "2 years · 3 months · 1 week · 4 days", trimming leading zero units. */
function fmtBreakdown(b: DurationParts): string {
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;
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
  const { partner } = usePartner();
  const { online } = usePartnerPresence();
  const partnerName = petNameOf(partner?.role);
  const where = partner?.city;
  const [sent, setSent] = useState(false);

  const sendLove = async () => {
    if (sent) return; // debounce: ignore taps during the "sent" window
    setSent(true);
    const notes = loveNotes(partnerName, genderOf(partner?.role));
    const note = notes[Math.floor(Math.random() * notes.length)];
    const { ok, delivered } = await notifyPartner({
      title: note,
      body: 'Toca para venir a casa 💌',
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
    <header className="flex flex-col items-center pt-1 text-center">
      {/* Eyebrow frames the name as the PARTNER's — never read as your own. */}
      <p className="font-sans text-[0.6rem] font-semibold uppercase tracking-[0.34em] text-gold/75">
        Your love
      </p>
      <p className="mt-1.5 font-display text-[2.05rem] font-medium leading-none text-fg">
        {partnerName}{' '}
        <span className="candle-flicker">{partner?.emoji ?? '❤️'}</span>
      </p>
      <div className="mt-2.5 flex items-center justify-center gap-2">
        <span
          className={cn(
            'inline-block h-[7px] w-[7px] shrink-0 rounded-full',
            online ? 'candle-flicker bg-purple' : 'bg-muted'
          )}
          style={
            online ? { boxShadow: '0 0 8px 1px rgba(44,138,94,0.6)' } : undefined
          }
          aria-hidden="true"
        />
        <span className="font-sans text-[0.84rem] text-muted">
          {online
            ? `here with you now${where ? ` · ${where}` : ''}`
            : partner?.last_seen_at
              ? `last here ${relativeTime(partner.last_seen_at)}`
              : 'away right now'}
        </span>
      </div>
      <button
        type="button"
        onClick={() => void sendLove()}
        disabled={sent}
        className="btn-catchlight lift-press mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 font-sans text-[0.9rem] font-semibold text-accent-fg shadow-loge disabled:opacity-100"
        style={{ border: '1px solid rgba(201,162,75,.42)' }}
      >
        <Heart
          size={15}
          className={cn(sent ? 'candle-flicker fill-current' : 'fill-current')}
        />
        {sent ? 'Love sent 💌' : 'Send love'}
      </button>
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
      className="relative mt-6 overflow-hidden rounded text-center"
      style={{
        border: '1px solid transparent',
        borderImage:
          'linear-gradient(150deg,#8a6c28,#e4c36a 42%,#fff1c9 50%,#e4c36a 58%,#8a6c28) 1',
        background:
          'radial-gradient(70% 40% at 50% 102%, rgba(201,162,75,.14), transparent 70%), radial-gradient(90% 55% at 50% -8%, rgba(196,200,213,.12), transparent 60%), linear-gradient(168deg, #3a0d1a 0%, #220812 52%, #130407 100%)',
        boxShadow:
          'inset 0 2px 0 rgba(255,241,201,.18), 0 26px 50px -26px rgba(0,0,0,.8)',
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
        <p className="m-0 mt-3.5 font-display text-xs font-semibold uppercase tracking-[0.33em] text-[#d6ad55]">
          {self.city ?? '—'}&nbsp; ✦ &nbsp;{partner.city ?? '—'}
        </p>
        <p className="m-0 mt-4 text-[10.5px] font-bold uppercase tracking-[0.3em] text-[#c89aa6]">
          Together for
        </p>
        <p className="gilt-text gold-shimmer gilt-figures m-0 mt-1 font-display text-[5.6rem] font-semibold tracking-tight">
          {days.toLocaleString()}
        </p>
        <p className="m-0 mt-1 font-display text-[17px] italic text-[#dcbcc3]">
          days — and every one a gift
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
  );
}

export function HomeRoute() {
  return (
    <div
      className="curtain-reveal space-y-5"
      style={{ '--i': 0 } as CSSProperties}
    >
      <Greeting />
      <CurrencyWidget />
      <TogetherHero />
      <GeorgiaCountdownWidget />
      <TodayQuestionsWidget />
      <LastPolaroidWidget />
    </div>
  );
}
