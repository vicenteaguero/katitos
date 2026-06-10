import { useMemo, useRef } from 'react';
import { useDrag, usePinch } from '@use-gesture/react';
import { REVEAL_SPAN } from './tree-geometry';
import {
  bucket,
  buildGeometry,
  type MilestoneAnchor,
  type Segment,
} from './tree-geometry';

const SCALE_MIN = 0.6;
const SCALE_MAX = 4;

interface TreeCanvasProps {
  seed: number;
  /** Continuous stage 0..100 (from tree_state.growth_points). */
  stage: number;
  /** Live health 0.05..1. */
  health: number;
  milestones?: MilestoneAnchor[];
  onTapMilestone?: (id: string) => void;
  className?: string;
}

/** Drawn fraction (0..1) of a segment at the current stage. */
function drawn(seg: Segment, stage: number): number {
  const t = (stage - seg.revealAt) / REVEAL_SPAN;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function leafColor(health: number): string {
  // Lush green when healthy, wilting toward amber as health drops.
  if (health > 0.6) return '#4caf50';
  if (health > 0.3) return '#8bc34a';
  return '#c0a04a';
}

export function TreeCanvas({
  seed,
  stage,
  health,
  milestones = [],
  onTapMilestone,
  className,
}: TreeCanvasProps) {
  const viewRef = useRef<HTMLDivElement>(null);
  const transform = useRef({ scale: 1, x: 0, y: 0 });

  const milestoneIds = milestones
    .map((m) => m.id)
    .sort()
    .join(',');

  const geometry = useMemo(
    () =>
      buildGeometry({
        seed,
        stage: Math.round(stage),
        health: bucket(health, 0.1),
        milestones,
      }),
    // memo on (seed, round(stage), bucket(health,0.1), milestoneIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed, Math.round(stage), bucket(health, 0.1), milestoneIds]
  );

  const { bounds, segments } = geometry;
  const pad = 30;
  const vbX = bounds.minX - pad;
  const vbY = bounds.minY - pad;
  const vbW = bounds.maxX - bounds.minX + pad * 2;
  const vbH = bounds.maxY - bounds.minY + pad * 2;

  const apply = () => {
    const el = viewRef.current;
    if (!el) return;
    const { scale, x, y } = transform.current;
    el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  };

  usePinch(
    ({ offset: [s] }) => {
      transform.current.scale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, s));
      apply();
    },
    {
      target: viewRef,
      eventOptions: { passive: false },
      scaleBounds: { min: SCALE_MIN, max: SCALE_MAX },
    }
  );

  const bindDrag = useDrag(
    ({ offset: [ox, oy] }) => {
      transform.current.x = ox;
      transform.current.y = oy;
      apply();
    },
    { from: () => [transform.current.x, transform.current.y] }
  );

  const leaf = leafColor(health);

  return (
    <div
      className={className}
      style={{ touchAction: 'none', overflow: 'hidden' }}
    >
      <div
        ref={viewRef}
        {...bindDrag()}
        style={{
          touchAction: 'none',
          width: '100%',
          height: '100%',
          transformOrigin: 'center bottom',
        }}
      >
        <svg
          viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMax meet"
        >
          <g style={{ ['--health' as string]: health }}>
            {segments.map((seg) => {
              const f = drawn(seg, stage);
              if (f <= 0) return null;
              const x2 = seg.x1 + (seg.x2 - seg.x1) * f;
              const y2 = seg.y1 + (seg.y2 - seg.y1) * f;

              if (seg.kind === 'flower' || seg.kind === 'fruit') {
                return (
                  <circle
                    key={seg.id}
                    cx={x2}
                    cy={y2}
                    r={Math.max(3, seg.width + 3)}
                    fill={seg.kind === 'flower' ? '#f48fb1' : '#e57373'}
                    stroke="#fff"
                    strokeWidth={0.5}
                    className="tree-bloom"
                    style={{ cursor: 'pointer' }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      if (seg.milestoneId) onTapMilestone?.(seg.milestoneId);
                    }}
                  />
                );
              }

              if (seg.kind === 'leaf') {
                return (
                  <circle
                    key={seg.id}
                    cx={x2}
                    cy={y2}
                    r={Math.max(1.5, seg.width + 1)}
                    fill={leaf}
                    opacity={0.85}
                  />
                );
              }

              const isBranch = seg.kind === 'branch';
              return (
                <line
                  key={seg.id}
                  x1={seg.x1}
                  y1={seg.y1}
                  x2={x2}
                  y2={y2}
                  stroke="#6b4423"
                  strokeWidth={seg.width}
                  strokeLinecap="round"
                  className={isBranch ? 'sway-branch' : undefined}
                  style={
                    isBranch
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
      </div>
    </div>
  );
}
