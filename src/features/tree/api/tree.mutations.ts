import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { useUserId } from '@kernel/auth';
import { notifyPartner } from '@kernel/push';
import { qk } from '@kernel/query';
import { toast } from '@kernel/ui';
import type { TreeState } from '../types';

/**
 * Water the tree via the `water_tree` RPC (the only path). Optimistically flips
 * `last_watered_by` to self so the button instantly shows "waiting", then
 * reconciles with the returned authoritative row. Rolls back on ANY error; the
 * 'not your turn' (P0001) case is the expected double-tap and gets a gentle hint
 * that never blames the partner.
 */
export function useWaterTree(partnerName?: string, selfName?: string) {
  const qc = useQueryClient();
  const selfId = useUserId();
  return useMutation({
    mutationFn: async (): Promise<TreeState> => {
      const { data, error } = await supabase.rpc('water_tree');
      if (error) throw error;
      return data as TreeState;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: qk.tree.state() });
      const prev = qc.getQueryData<TreeState | null>(qk.tree.state());
      if (prev && selfId) {
        qc.setQueryData<TreeState>(qk.tree.state(), {
          ...prev,
          last_watered_by: selfId,
          water_count: prev.water_count + 1,
        });
      }
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(qk.tree.state(), ctx.prev);
      }
      const code = (err as { code?: string } | null)?.code;
      const message = (err as { message?: string } | null)?.message ?? '';
      if (code === 'P0001' || message.includes('not your turn')) {
        toast.info(`Waiting for ${partnerName ?? 'them'} to water 🌱`);
      } else {
        toast.error(message || "Couldn't water the tree");
      }
    },
    onSuccess: (row) => {
      qc.setQueryData(qk.tree.state(), row);
      void notifyPartner({
        kind: 'tree',
        title: '🌳',
        body: `${selfName ?? 'Your love'} watered our tree - your turn 💧`,
        url: '/tree',
        tag: 'tree-water',
      });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.tree.all() });
    },
  });
}

/** Edit a milestone's note (the only mutable field). */
export function useUpdateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string | null }) => {
      const { error } = await supabase
        .from('tree_milestones')
        .update({ note })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.tree.milestones() }),
  });
}
