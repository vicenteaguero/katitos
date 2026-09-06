import type { CSSProperties } from 'react';
import { usePartner } from '@kernel/auth';
import { Badge, Card, CardTitle } from '@kernel/ui';
import { useLoveMap } from '../api/know-me.queries';

function Dial({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="flex-1 space-y-3 text-center">
      {/* A square gilt-framed tile with a percent and an Imperial-Purple meter
          that fills from below - her royal note rising like footlight. */}
      <div className="bg-surface-2 relative grid h-24 w-full place-items-center overflow-hidden rounded-lg">
        <div
          className="absolute inset-x-0 bottom-0 bg-purple/35"
          style={{ height: `${pct}%` }}
          aria-hidden="true"
        />
        <span className="relative font-display text-3xl font-semibold tabular-nums text-fg">
          {pct}%
        </span>
      </div>
      <p className="font-sans text-xs uppercase tracking-[0.1em] text-muted">
        {label}
      </p>
    </div>
  );
}

function Star({
  value,
  label,
  delay,
  glow = false,
}: {
  value: number | string;
  label: string;
  delay: number;
  glow?: boolean;
}) {
  return (
    <div
      className="km-star text-center"
      style={{ '--km-star-delay': `${delay}s` } as CSSProperties}
    >
      <p
        className={
          glow
            ? 'font-display text-3xl font-semibold tabular-nums text-purple'
            : 'font-display text-3xl font-semibold tabular-nums text-fg'
        }
      >
        {value}
      </p>
      <p className="mt-1 font-sans text-xs uppercase tracking-[0.1em] text-muted">
        {label}
      </p>
    </div>
  );
}

/** Two accuracy dials, streaks, days played, category coverage. */
export function LoveMapPanel() {
  const { partner } = usePartner();
  const map = useLoveMap();
  const partnerName = partner?.display_name ?? 'them';

  if (!map) return null;

  return (
    <Card className="space-y-7">
      <CardTitle>Your love map ❤️</CardTitle>

      <div className="flex gap-5">
        <Dial
          label={`You know ${partnerName}`}
          pct={map.selfKnowsPartner.pct}
        />
        <Dial
          label={`${partnerName} knows you`}
          pct={map.partnerKnowsSelf.pct}
        />
      </div>

      {/* The standings as a faint constellation of pulsing points. */}
      <div className="flex justify-around">
        <Star value={`${map.currentStreak} 🔥`} label="streak" delay={0} glow />
        <Star value={map.longestStreak} label="longest" delay={1.2} />
        <Star value={map.daysPlayed} label="days played" delay={2.4} />
      </div>

      {Object.keys(map.categoryCoverage).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(map.categoryCoverage).map(([cat, n]) => (
            <Badge key={cat} tone="accent">
              {cat} - {n}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}
