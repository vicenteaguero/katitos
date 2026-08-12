import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { usePartner, useUserId } from '@kernel/auth';
import { notifyPartner } from '@kernel/push';
import { BUCKETS, storagePaths, useUpload } from '@kernel/storage';
import { qk } from '@kernel/query';
import { toast } from '@kernel/ui';
import type { KnowMeOption } from '../types';

/** Fire the no-arg ensure-today RPC (idempotent). Route guards it per day. */
export function useEnsureToday() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('know_me_ensure_today');
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.knowMe.today() }),
  });
}

/** Submit my own truth + my guess of the partner (single write). */
export function useSubmitAnswer(dayId: string | undefined) {
  const qc = useQueryClient();
  const { self } = usePartner();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async ({ own, guess }: { own: string; guess: string }) => {
      if (!dayId) throw new Error('No question to answer');
      // Target THIS question explicitly — a day now holds several.
      const { error } = await supabase.rpc('know_me_submit_day', {
        p_day_id: dayId,
        p_own: own,
        p_guess: guess,
      });
      if (error) throw error;
      void notifyPartner({
        kind: 'know-me',
        title: 'Katitos ❤️',
        body: `${self?.display_name ?? 'Your love'} answered — see how you did`,
        url: '/know-me',
      });
    },
    onSuccess: () => {
      if (dayId) {
        void qc.invalidateQueries({ queryKey: qk.knowMe.myAnswer(dayId) });
        void qc.invalidateQueries({ queryKey: qk.knowMe.reveal(dayId) });
      }
      void qc.invalidateQueries({ queryKey: qk.knowMe.stats() });
    },
  });
}

/** Attach a reaction selfie to my own answer row after reveal. */
export function useAttachReaction(dayId: string | undefined) {
  const qc = useQueryClient();
  const userId = useUserId();
  const { upload } = useUpload();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async (blob: Blob) => {
      if (!dayId || !userId) throw new Error('Not ready');
      const path = storagePaths.knowMeReaction(dayId, userId);
      await upload(BUCKETS.quizMedia, path, blob, {
        upsert: true,
        contentType: 'image/jpeg',
      });
      const { error } = await supabase
        .from('know_me_answers')
        .update({ reaction_path: path })
        .eq('day_id', dayId)
        .eq('user_id', userId);
      if (error) throw error;
      return path;
    },
    onSuccess: () => {
      if (dayId)
        void qc.invalidateQueries({ queryKey: qk.knowMe.reveal(dayId) });
      void qc.invalidateQueries({ queryKey: ['signed-url'] });
    },
  });
}

export interface NewQuestion {
  prompt: string;
  category: string;
  options: KnowMeOption[];
}

/**
 * Author a custom question (is_custom = true, 4 options). Optional per-option
 * images are uploaded to the quiz-media bucket first.
 */
export function useAuthorQuestion() {
  const qc = useQueryClient();
  return useMutation({
    onError: (e: Error) => toast.error(e.message),
    mutationFn: async ({
      prompt,
      category,
      options,
      optionImages,
    }: NewQuestion & { optionImages?: Record<string, Blob> }) => {
      const { data: inserted, error } = await supabase
        .from('know_me_questions')
        .insert({
          prompt,
          category,
          is_custom: true,
          options: options as unknown as never,
        })
        .select('id')
        .single();
      if (error) throw error;

      const images = optionImages ?? {};
      const optionIds = Object.keys(images);
      if (optionIds.length > 0) {
        const finalOptions: KnowMeOption[] = [];
        for (const opt of options) {
          const blob = images[opt.id];
          if (blob) {
            const path = storagePaths.knowMeOption(inserted.id, opt.id);
            await supabase.storage
              .from(BUCKETS.quizMedia)
              .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
            finalOptions.push({ ...opt, imagePath: path });
          } else {
            finalOptions.push(opt);
          }
        }
        const { error: upErr } = await supabase
          .from('know_me_questions')
          .update({ options: finalOptions as unknown as never })
          .eq('id', inserted.id);
        if (upErr) throw upErr;
      }
      return inserted.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.knowMe.all() }),
  });
}
