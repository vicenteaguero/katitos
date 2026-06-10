import { usePartner } from '@kernel/auth';
import { Badge, Card, CardTitle } from '@kernel/ui';
import { useLoveMap } from '../api/know-me.queries';

function Dial({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="flex-1 text-center">
      <div
        className="mx-auto grid h-20 w-20 place-items-center rounded-full"
        style={{
          background: `conic-gradient(var(--color-accent, #e8a) ${pct}%, var(--color-surface-2, #333) 0)`,
        }}
      >
        <div className="grid h-14 w-14 place-items-center rounded-full bg-surface">
          <span className="text-lg font-bold tabular-nums">{pct}%</span>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted">{label}</p>
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
    <Card className="space-y-4">
      <CardTitle>Your love map 💛</CardTitle>

      <div className="flex gap-4">
        <Dial
          label={`You know ${partnerName}`}
          pct={map.selfKnowsPartner.pct}
        />
        <Dial
          label={`${partnerName} knows you`}
          pct={map.partnerKnowsSelf.pct}
        />
      </div>

      <div className="flex justify-around text-center text-sm">
        <div>
          <p className="text-xl font-bold text-accent">
            {map.currentStreak} 🔥
          </p>
          <p className="text-xs text-muted">streak</p>
        </div>
        <div>
          <p className="text-xl font-bold">{map.longestStreak}</p>
          <p className="text-xs text-muted">longest</p>
        </div>
        <div>
          <p className="text-xl font-bold">{map.daysPlayed}</p>
          <p className="text-xs text-muted">days played</p>
        </div>
      </div>

      {Object.keys(map.categoryCoverage).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(map.categoryCoverage).map(([cat, n]) => (
            <Badge key={cat}>
              {cat} · {n}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}
