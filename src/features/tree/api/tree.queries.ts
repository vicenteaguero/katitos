import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import type { TreeMilestone, TreeState, TreeWatering } from '../types';

/** The singleton tree row — authoritative for stage/height via growth_points. */
export function useTreeState() {
  return useQuery({
    queryKey: qk.tree.state(),
    queryFn: async (): Promise<TreeState | null> => {
      const { data, error } = await supabase
        .from('tree_state')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** The watering log — used ONLY for live-health deriveTree (capped). */
export function useTreeWaterings() {
  return useQuery({
    queryKey: qk.tree.waterings(),
    queryFn: async (): Promise<TreeWatering[]> => {
      const { data, error } = await supabase
        .from('tree_waterings')
        .select('*')
        .order('watered_at', { ascending: true })
        .limit(400);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Permanent milestones, ordered by their immutable segment slot. */
export function useTreeMilestones() {
  return useQuery({
    queryKey: qk.tree.milestones(),
    queryFn: async (): Promise<TreeMilestone[]> => {
      const { data, error } = await supabase
        .from('tree_milestones')
        .select('*')
        .order('slot', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
