import { DateTime } from 'luxon';
import { useNow } from '@kernel/hooks';
import { heightMeters, stageFromPoints } from '../lib/tree-growth';
import type { TreeState } from '../types';

interface TreeHudProps {
  state: TreeState;
  /** Live health 0.05..1. */
  health: number;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="gilt-text font-display text-2xl font-semibold leading-none tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
    </div>
  );
}

export function TreeHud({ state, health }: TreeHudProps) {
  const now = useNow(60_000);
  const planted = DateTime.fromISO(state.planted_at);
  const ageDays = Math.max(0, Math.floor(now.diff(planted, 'days').days));
  const height = heightMeters(state.growth_points);
  const stage = stageFromPoints(state.growth_points);
  const healthPct = Math.round(health * 100);

  return (
    <div className="velvet-2 gilt-hairline pointer-events-none space-y-3 rounded-none p-4 shadow-loge backdrop-blur">
      <div className="flex items-center justify-around gap-2">
        <Stat label="Height" value={`${height.toFixed(2)} m`} />
        <Stat label="Age" value={`${ageDays}d`} />
        <Stat label="Stage" value={`${stage.toFixed(0)}/100`} />
        <Stat label="Streak" value={`${state.current_streak}🔥`} />
      </div>
      <div className="flex items-center justify-between gap-2.5 font-sans text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
        <span>Health</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-none border border-border/40 bg-surface">
          <div
            className="h-full bg-success transition-all"
            style={{ width: `${healthPct}%` }}
          />
        </div>
        <span className="tabular-nums">best {state.longest_streak}🔥</span>
      </div>
    </div>
  );
}
