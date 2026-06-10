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
      <p className="text-lg font-bold tabular-nums leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
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
    <div className="pointer-events-none space-y-2 rounded-xl bg-surface-2/80 p-3 backdrop-blur">
      <div className="flex items-center justify-around gap-2">
        <Stat label="Height" value={`${height.toFixed(2)} m`} />
        <Stat label="Age" value={`${ageDays}d`} />
        <Stat label="Stage" value={`${stage.toFixed(0)}/100`} />
        <Stat label="Streak" value={`${state.current_streak}🔥`} />
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] text-muted">
        <span>Health</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${healthPct}%` }}
          />
        </div>
        <span className="tabular-nums">best {state.longest_streak}🔥</span>
      </div>
    </div>
  );
}
