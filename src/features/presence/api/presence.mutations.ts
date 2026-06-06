import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { useUserId } from '@kernel/auth';
import { qk } from '@kernel/query';

/** Log that the current user opened the app + refresh their last-seen. */
export function useLogAppOpen() {
  const userId = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('app_opens').insert({});
      if (error) throw error;
      if (userId) {
        await supabase
          .from('couple_members')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('user_id', userId);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.couple.members() });
      void qc.invalidateQueries({ queryKey: qk.presence.appOpens() });
    },
  });
}
