import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { BUCKETS, storagePaths, useUpload } from '@kernel/storage';
import { qk } from '@kernel/query';

export function useClaimCard() {
  const qc = useQueryClient();
  const { upload } = useUpload();
  return useMutation({
    mutationFn: async ({
      cardId,
      blob,
      note,
    }: {
      cardId: string;
      blob: Blob;
      note?: string | null;
    }) => {
      const path = storagePaths.scavengerProof(cardId);
      await upload(BUCKETS.scavengerProof, path, blob, {
        upsert: true,
        contentType: 'image/jpeg',
      });
      const { error } = await supabase
        .from('scavenger_claims')
        .upsert(
          { card_id: cardId, image_path: path, note: note ?? null },
          { onConflict: 'card_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.scavenger.cards() });
      void qc.invalidateQueries({ queryKey: ['signed-url'] });
    },
  });
}

export function useUnclaimCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase
        .from('scavenger_claims')
        .delete()
        .eq('card_id', cardId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.scavenger.cards() }),
  });
}

export function useAddScavengerCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string | null;
      points?: number;
      position?: number;
    }) => {
      const { error } = await supabase.from('scavenger_cards').insert({
        title: input.title,
        description: input.description ?? null,
        points: input.points ?? 1,
        position: input.position ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.scavenger.cards() }),
  });
}

export function useAddArgument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ cardId, body }: { cardId: string; body: string }) => {
      const { error } = await supabase
        .from('scavenger_arguments')
        .upsert({ card_id: cardId, body }, { onConflict: 'card_id,user_id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.scavenger.cards() }),
  });
}

export function useDeleteScavengerCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scavenger_cards')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.scavenger.cards() }),
  });
}
