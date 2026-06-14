import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { BUCKETS, storagePaths, useUpload } from '@kernel/storage';
import { qk } from '@kernel/query';

/** Add a date card to your own deck (created_by defaults to you), with an
 *  optional photo of the physical card. */
export function useAddDateCard() {
  const qc = useQueryClient();
  const { upload } = useUpload();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string | null;
      position?: number;
      cardBlob?: Blob | null;
    }) => {
      const { data, error } = await supabase
        .from('scavenger_cards')
        .insert({
          title: input.title,
          description: input.description ?? null,
          position: input.position ?? 0,
        })
        .select('id')
        .single();
      if (error) throw error;

      if (input.cardBlob) {
        const path = storagePaths.scavengerCardImage(data.id);
        await upload(BUCKETS.scavengerProof, path, input.cardBlob, {
          upsert: true,
          contentType: 'image/jpeg',
        });
        const { error: e2 } = await supabase
          .from('scavenger_cards')
          .update({ card_image_path: path })
          .eq('id', data.id);
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.scavenger.cards() });
      void qc.invalidateQueries({ queryKey: ['signed-url'] });
    },
  });
}

/** Mark a date done by uploading its photo — either partner may do this. */
export function useMarkDateDone() {
  const qc = useQueryClient();
  const { upload } = useUpload();
  return useMutation({
    mutationFn: async ({ cardId, blob }: { cardId: string; blob: Blob }) => {
      const path = storagePaths.scavengerProof(cardId);
      await upload(BUCKETS.scavengerProof, path, blob, {
        upsert: true,
        contentType: 'image/jpeg',
      });
      const { error } = await supabase
        .from('scavenger_claims')
        .upsert(
          { card_id: cardId, image_path: path },
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

/** Rate a done date 1–3 stars — only the NON-owner calls this (enforced in UI).
 *  The stars go to the card's owner; the pot budget is checked before calling. */
export function useRateDate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      cardId,
      stars,
      ratedBy,
    }: {
      cardId: string;
      stars: number;
      ratedBy: string;
    }) => {
      const { error } = await supabase
        .from('scavenger_claims')
        .update({
          stars,
          rated_by: ratedBy,
          rated_at: new Date().toISOString(),
        })
        .eq('card_id', cardId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.scavenger.cards() }),
  });
}

/** The owner accepts the partner's stars → the rating locks, final forever.
 *  Only the card owner calls this (enforced in UI). */
export function useAcceptRating() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase
        .from('scavenger_claims')
        .update({ accepted: true })
        .eq('card_id', cardId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.scavenger.cards() }),
  });
}

/** Undo a completion (clears the photo + any stars, returning them to the pot). */
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
