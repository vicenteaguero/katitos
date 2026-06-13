import { useState, type CSSProperties } from 'react';
import { Heart } from 'lucide-react';
import { usePartner } from '@kernel/auth';
import { useCouple } from '@kernel/couple';
import { useNow } from '@kernel/hooks';
import {
  daysTogether,
  formatDistance,
  haversineKm,
  relativeTime,
  timeInZone,
} from '@kernel/lib';
import { notifyPartner } from '@kernel/push';
import { toast } from '@kernel/ui';
import { usePartnerPresence } from '@features/presence';
import { GeorgiaCountdownWidget } from '@features/georgia';
import { TodayQuestionsWidget } from '@features/know-me';
import { LastPolaroidWidget } from '@features/polaroid';

/** Our pet names by role: him (a) is Katito, her (b) is Katita. */
function petNameOf(role: string | null | undefined): 'Katito' | 'Katita' {
  return role === 'a' ? 'Katito' : 'Katita';
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
  const myName = petNameOf(self?.role);
  const where = partner?.city;
  const [sent, setSent] = useState(false);

  const sendLove = () => {
    void notifyPartner({
      title: `Your ${myName} loves you so much ❤️`,
      url: '/',
    });
    setSent(true);
    toast.success('Sent 💌');
    window.setTimeout(() => setSent(false), 2200);
  };

  return (
    <header className="space-y-3 pt-1 text-center">
      <p className="font-display text-[1.75rem] font-medium italic leading-tight text-fg">
        Your {partnerName}{' '}
        <span className="candle-flicker not-italic">
          {partner?.emoji ?? '❤️'}
        </span>
      </p>
      <div className="flex items-center justify-center gap-2">
        <span
          className={`inline-block h-[7px] w-[7px] shrink-0 rounded-full ${
            online ? 'candle-flicker bg-purple' : 'bg-muted'
          }`}
          style={
            online
              ? { boxShadow: '0 0 8px 1px rgba(44,138,94,0.6)' }
              : undefined
          }
          aria-hidden="true"
        />
        <span className="font-sans text-[0.84rem] text-muted">
          {online
            ? `is here with you now${where ? ` · ${where}` : ''}`
            : partner?.last_seen_at
              ? `was here ${relativeTime(partner.last_seen_at)}`
              : 'is away'}
        </span>
      </div>
      <button
        type="button"
        onClick={sendLove}
        className="lift-press mx-auto inline-flex items-center gap-2 rounded-full bg-accent/90 px-5 py-2 font-sans text-sm font-semibold text-accent-fg shadow-loge transition active:scale-95"
      >
        <Heart
          size={16}
          className={sent ? 'candle-flicker fill-current' : 'fill-current'}
        />
        {sent ? 'Sent 💌' : `Send ${partnerName} love`}
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
      <TogetherHero />
      <GeorgiaCountdownWidget />
      <TodayQuestionsWidget />
      <LastPolaroidWidget />
    </div>
  );
}
