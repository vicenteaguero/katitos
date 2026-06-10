import { useEffect, useRef, useState } from 'react';
import { useUserId, usePartner } from '@kernel/auth';
import { useCouple } from '@kernel/couple';
import { useNow } from '@kernel/hooks';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { useTableSync } from '@kernel/realtime';
import { useQueryClient } from '@tanstack/react-query';
import { LoadingScreen, PageHeader } from '@kernel/ui';
import { health, heightMeters, stageFromPoints } from '../lib/tree-growth';
import {
  useTreeMilestones,
  useTreeState,
  useTreeWaterings,
} from '../api/tree.queries';
import { TreeCanvas } from '../components/tree-canvas';
import { TreeHud } from '../components/tree-hud';
import { WaterButton } from '../components/water-button';
import { MilestoneSheet } from '../components/milestone-sheet';
import type { MilestoneAnchor } from '../components/tree-geometry';
import type { MilestoneInput, TreeMilestone, TreeState } from '../types';

const STAGE_THRESHOLDS = [10, 25, 50, 75, 90];
const HEIGHT_THRESHOLDS = [1, 3, 5, 8, 11];
const STREAK_THRESHOLDS = [7, 30, 100, 365];

/** Deterministic small hash → an anchor-segment slot both clients agree on. */
function slotFor(kind: string, threshold: number): number {
  let h = 2166136261;
  const key = `${kind}:${threshold}`;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Keep within the ~350-segment budget so it pins to a real segment.
  return (h >>> 0) % 350;
}

function milestoneEmoji(kind: string): string {
  if (kind === 'height') return '📏';
  if (kind === 'streak') return '🔥';
  return '🌱';
}

function milestoneTitle(kind: string, threshold: number): string {
  if (kind === 'stage') return `Stage ${threshold}`;
  if (kind === 'height') return `${threshold} m tall`;
  return `${threshold}-day streak`;
}

export function TreeRoute() {
  useTableSync('tree_state', qk.tree.state());
  useTableSync('tree_waterings', qk.tree.waterings());
  useTableSync('tree_milestones', qk.tree.milestones());

  const qc = useQueryClient();
  const selfId = useUserId();
  const { self, partner } = usePartner();
  useCouple();

  const { data: state, isLoading } = useTreeState();
  const { data: waterings } = useTreeWaterings();
  const { data: milestones } = useTreeMilestones();

  const now = useNow(60_000);
  const [tapped, setTapped] = useState<TreeMilestone | null>(null);

  // Milestone detection: on every tree_state change, insert newly-crossed
  // milestones. The DB unique indexes dedup, so duplicate inserts are no-ops.
  const detectedRef = useRef(false);
  const lastPointsRef = useRef<number | null>(null);

  useEffect(() => {
    if (!state) return;
    if (lastPointsRef.current === state.growth_points && detectedRef.current) {
      return;
    }
    lastPointsRef.current = state.growth_points;
    detectedRef.current = true;

    const stage = stageFromPoints(state.growth_points);
    const heightM = heightMeters(state.growth_points);
    const existing = new Set(
      (milestones ?? []).map((m) => `${m.kind}:${m.threshold}`)
    );
    const coupleDayStr = (state.last_streak_day ?? now.toISODate()) as string;

    const pending: MilestoneInput[] = [];
    const consider = (
      kind: MilestoneInput['kind'],
      value: number,
      thresholds: number[]
    ) => {
      for (const t of thresholds) {
        if (value >= t && !existing.has(`${kind}:${t}`)) {
          pending.push({
            kind,
            slot: slotFor(kind, t),
            threshold: t,
            title: milestoneTitle(kind, t),
            emoji: milestoneEmoji(kind),
            couple_day: coupleDayStr,
          });
        }
      }
    };

    consider('stage', stage, STAGE_THRESHOLDS);
    consider('height', heightM, HEIGHT_THRESHOLDS);
    consider('streak', state.current_streak, STREAK_THRESHOLDS);

    if (pending.length === 0) return;

    void (async () => {
      for (const m of pending) {
        // 23505 = unique_violation → already recorded by the other client, ignore.
        await supabase.from('tree_milestones').insert(m);
      }
      void qc.invalidateQueries({ queryKey: qk.tree.milestones() });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.growth_points, state?.current_streak, milestones]);

  if (isLoading || !state) {
    return <LoadingScreen />;
  }

  const tree = state as TreeState;
  const lastWateredAt = tree.last_watered_at
    ? new Date(tree.last_watered_at).getTime()
    : null;
  const liveHealth = health(lastWateredAt, now.toMillis());
  void waterings; // log fetched for live deriveTree parity; health is enough here

  const anchors: MilestoneAnchor[] = (milestones ?? []).map((m) => ({
    id: m.id,
    slot: m.slot,
    kind: m.kind === 'height' ? 'fruit' : 'flower',
  }));

  const onTapMilestone = (id: string) => {
    const m = (milestones ?? []).find((x) => x.id === id) ?? null;
    setTapped(m);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Our Tree" subtitle="Grown one drop at a time 🌳" />

      <div className="relative">
        <TreeCanvas
          seed={Number(tree.seed)}
          stage={stageFromPoints(tree.growth_points)}
          health={liveHealth}
          milestones={anchors}
          onTapMilestone={onTapMilestone}
          className="aspect-[3/4] w-full rounded-2xl bg-gradient-to-b from-sky-100/40 to-emerald-100/30 dark:from-sky-950/40 dark:to-emerald-950/30"
        />
        <div className="absolute inset-x-3 top-3">
          <TreeHud state={tree} health={liveHealth} />
        </div>
      </div>

      {selfId && (
        <WaterButton
          state={tree}
          selfId={selfId}
          selfName={self?.display_name}
          partnerName={partner?.display_name}
          health={liveHealth}
        />
      )}

      <MilestoneSheet milestone={tapped} onClose={() => setTapped(null)} />
    </div>
  );
}
