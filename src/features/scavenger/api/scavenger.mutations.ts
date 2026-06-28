import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { BUCKETS, storagePaths, useUpload } from '@kernel/storage';
import { qk } from '@kernel/query';

/** Add a date card to your own deck (created_by defaults to you), with an
 *  optional photo of the physical card. It stays PRIVATE to you until claimed. */
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

/** CLAIM (or re-claim) a date — the creator did it, so reveal it to the partner
 *  for review. Upserts the single claim row: claimed by me, NOT dismissed, with
 *  any prior stars/rating wiped (a clean slate for a re-claim). The proof photo
 *  is optional; when present it is uploaded and recorded, otherwise any existing
 *  one is left untouched. Only the card's creator should call this. */
export function useClaimCard() {
  const qc = useQueryClient();
  const { upload } = useUpload();
  return useMutation({
    mutationFn: async ({
      cardId,
      claimedBy,
      blob,
    }: {
      cardId: string;
      claimedBy: string;
      blob?: Blob | null;
    }) => {
      let imagePath: string | undefined;
      if (blob) {
        imagePath = storagePaths.scavengerProof(cardId);
        await upload(BUCKETS.scavengerProof, imagePath, blob, {
          upsert: true,
          contentType: 'image/jpeg',
        });
      }
      const { error } = await supabase.from('scavenger_claims').upsert(
        {
          card_id: cardId,
          claimed_by: claimedBy,
          claimed_at: new Date().toISOString(),
          dismissed: false,
          accepted: false,
          stars: null,
          rated_by: null,
          rated_at: null,
          // Omitted on a photoless re-claim so the prior proof is preserved.
          ...(imagePath ? { image_path: imagePath } : {}),
        },
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

/** Rate a claimed date 1–3 stars — only the NON-creator calls this (enforced in
 *  UI). The stars go to the card's creator; the pot budget is checked first. */
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

/** Cancel the review — the partner hides a claimed card again until it is
 *  re-claimed, clearing any stars so they leave the pot. Non-creator only. */
export function useDismissClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase
        .from('scavenger_claims')
        .update({
          dismissed: true,
          stars: null,
          rated_by: null,
          rated_at: null,
        })
        .eq('card_id', cardId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.scavenger.cards() }),
  });
}

/** The creator accepts the partner's stars → the rating locks, final forever.
 *  Only the card creator calls this (enforced in UI). */
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

/** Unclaim — the creator claimed by mistake; delete the claim row entirely so
 *  the card is private again, as if it had never been claimed. */
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
