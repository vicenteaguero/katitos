import { Button } from '@kernel/ui';
import { canWater } from '../lib/tree-growth';
import { useWaterTree } from '../api/tree.mutations';
import type { TreeState } from '../types';

interface WaterButtonProps {
  state: TreeState;
  selfId: string;
  selfName?: string;
  partnerName?: string;
  /** Live health 0.05..1 — drives the thirsty hint when it's not your turn. */
  health: number;
}

const THIRSTY = 0.35;

export function WaterButton({
  state,
  selfId,
  selfName,
  partnerName,
  health,
}: WaterButtonProps) {
  const water = useWaterTree(partnerName, selfName);
  const { ok } = canWater(state.last_watered_by, selfId);

  if (!ok) {
    return (
      <div className="space-y-3 text-center">
        <Button full size="lg" variant="secondary" disabled>
          Waiting for {partnerName ?? 'them'} 🌱
        </Button>
        {health < THIRSTY && (
          <p className="font-sans text-xs text-muted">
            The tree is thirsty 🥀 — {partnerName ?? 'they'} can water it
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 text-center">
      <Button
        full
        size="lg"
        disabled={water.isPending}
        onClick={() => water.mutate()}
        className="font-display text-xl tracking-[0.04em]"
      >
        {water.isPending ? 'Watering…' : 'Water our tree 💧'}
      </Button>
      <p className="font-sans text-xs uppercase tracking-[0.18em] text-success">
        Your turn at the ritual
      </p>
    </div>
  );
}
