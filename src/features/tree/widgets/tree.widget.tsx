import { useMemo } from 'react';
import { Link } from 'react-router';
import { useUserId, usePartner } from '@kernel/auth';
import { useNow } from '@kernel/hooks';
import { Card, CardTitle } from '@kernel/ui';
import { canWater, health, stageFromPoints } from '../lib/tree-growth';
import { buildGeometry } from '../components/tree-geometry';
import { REVEAL_SPAN } from '../components/tree-geometry';
import { useTreeState } from '../api/tree.queries';

const THIRSTY = 0.35;

export function TreeWidget() {
  const { data: state } = useTreeState();
  const { partner } = usePartner();
  const selfId = useUserId();
  const now = useNow(60_000);

  const lastWateredAt = state?.last_watered_at
    ? new Date(state.last_watered_at).getTime()
    : null;
  const liveHealth = health(lastWateredAt, now.toMillis());
  const stage = state ? stageFromPoints(state.growth_points) : 0;

  const geometry = useMemo(
    () =>
      state
        ? buildGeometry({
            seed: Number(state.seed),
            stage: Math.round(stage),
            health: liveHealth,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state?.seed, Math.round(stage)]
  );

  let status = 'Thirsty 🥀';
  if (state && selfId) {
    const { ok } = canWater(state.last_watered_by, selfId);
    if (ok) status = 'Your turn 💧';
    else if (liveHealth < THIRSTY) status = 'Thirsty 🥀';
    else status = `Waiting for ${partner?.display_name ?? 'them'}`;
  }

  const { bounds, segments } = geometry ?? { bounds: null, segments: [] };

  return (
    <Link to="/tree">
      <Card className="footlight flex h-full flex-col">
        <CardTitle>Our Tree</CardTitle>
        {bounds && (
          <svg
            viewBox={`${bounds.minX - 20} ${bounds.minY - 20} ${
              bounds.maxX - bounds.minX + 40
            } ${bounds.maxY - bounds.minY + 40}`}
            className="my-2 h-20 w-full"
            preserveAspectRatio="xMidYMax meet"
          >
            <g>
              {segments.map((seg) => {
                const f = Math.min(
                  1,
                  Math.max(0, (stage - seg.revealAt) / REVEAL_SPAN)
                );
                if (f <= 0) return null;
                const x2 = seg.x1 + (seg.x2 - seg.x1) * f;
                const y2 = seg.y1 + (seg.y2 - seg.y1) * f;
                if (seg.kind === 'leaf') {
                  return (
                    <circle
                      key={seg.id}
                      cx={x2}
                      cy={y2}
                      r={Math.max(1.5, seg.width + 1)}
                      fill="var(--color-success)"
                      opacity={0.85}
                    />
                  );
                }
                return (
                  <line
                    key={seg.id}
                    x1={seg.x1}
                    y1={seg.y1}
                    x2={x2}
                    y2={y2}
                    stroke="var(--color-brown)"
                    strokeWidth={seg.width}
                    strokeLinecap="round"
                    className={
                      seg.kind === 'branch' ? 'sway-branch' : undefined
                    }
                    style={
                      seg.kind === 'branch'
                        ? {
                            ['--sway-delay' as string]: `${(seg.id % 7) * 0.3}s`,
                          }
                        : undefined
                    }
                  />
                );
              })}
            </g>
          </svg>
        )}
        <p className="mt-auto font-sans text-xs font-semibold uppercase tracking-[0.18em] text-success">
          {status}
        </p>
      </Card>
    </Link>
  );
}
