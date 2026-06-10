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
      <div className="space-y-1 text-center">
        <Button full size="lg" disabled>
          Waiting for {partnerName ?? 'them'} 🌱
        </Button>
        {health < THIRSTY && (
          <p className="text-xs text-muted">
            The tree is thirsty 🥀 — {partnerName ?? 'they'} can water it
          </p>
        )}
      </div>
    );
  }

  return (
    <Button
      full
      size="lg"
      disabled={water.isPending}
      onClick={() => water.mutate()}
    >
      {water.isPending ? 'Watering…' : 'Water 💧'}
    </Button>
  );
}
