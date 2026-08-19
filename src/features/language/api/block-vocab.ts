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
      // Replace the whole selection: it is a short, hand-picked list, and
      // diffing it would cost more than rewriting it.
      const { error: delErr } = await supabase
        .from('lang_block_vocab')
        .delete()
        .eq('block_id', v.blockId);
      if (delErr) throw delErr;

      if (!v.vocabIds.length) return;
      const { error } = await supabase.from('lang_block_vocab').insert(
        v.vocabIds.map((vocabId, position) => ({
          block_id: v.blockId,
          vocab_id: vocabId,
          position,
        }))
      );
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.lesson(v.lessonId) }),
  });
}
