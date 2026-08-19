import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { toast } from '@kernel/ui';

/**
 * Which words a vocab block teaches.
 *
 * A block SELECTS from the dictionary rather than copying out of it, so
 * correcting a stress mark in one place corrects it in every lesson that word
 * has ever appeared in. This is the join that makes that true.
 */
export function useSetBlockVocab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      blockId: string;
      lessonId: string;
      vocabIds: string[];
    }) => {
      // ONE statement, so it either replaces the list or leaves it alone.
      // Deleting and then inserting from here meant a failure between the two
      // left the block empty with nothing to restore from.
      const { error } = await supabase.rpc('set_block_vocab', {
        p_block: v.blockId,
        p_vocab: v.vocabIds,
      });
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.lesson(v.lessonId) }),
  });
}
