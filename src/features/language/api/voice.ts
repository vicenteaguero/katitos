import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { usePartner } from '@kernel/auth';
import { notifyPartner } from '@kernel/push';
import { BUCKETS, storagePaths, useUpload } from '@kernel/storage';
import { toast, type AudioClip } from '@kernel/ui';
import { isAsleep } from '../lib/quiet';
import type { Lang, Voice } from '../types';

/** Every recording of one word, newest first: his tries and her answers. */
export function useVoiceFor(vocabId: string | undefined) {
  return useQuery({
    queryKey: qk.lang.voice(vocabId ?? 'none'),
    enabled: !!vocabId,
    staleTime: 30_000,
    queryFn: async (): Promise<Voice[]> => {
      const { data, error } = await supabase
        .from('lang_voice')
        .select('*')
        .eq('vocab_id', vocabId as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Voice[];
    },
  });
}

/**
 * Say a word for the other one — his try, or her answer to it.
 *
 * The clip goes up first, the row second, and the other phone is told
 * unless it is night there. Nothing commercial can do this: the voice he
 * hears on the word he keeps missing is hers, aimed at him.
 */
export function useSendVoice() {
  const qc = useQueryClient();
  const { upload } = useUpload();
  const { self, partner } = usePartner();
  return useMutation({
    mutationFn: async (v: {
      vocabId: string;
      /** The word as written, for the push. */
      word: string;
      lang: Lang;
      clip: AudioClip;
      replyTo?: string | null;
      wake?: boolean;
    }) => {
      const path = storagePaths.languageVoice(nanoid(10), v.clip.ext);
      await upload(BUCKETS.languageAudio, path, v.clip.blob, {
        contentType: v.clip.mime,
        cacheControl: '31536000',
      });
      const { data, error } = await supabase
        .from('lang_voice')
        .insert({
          vocab_id: v.vocabId,
          audio_path: path,
          reply_to: v.replyTo ?? null,
        })
        .select('*')
        .single();
      if (error) {
        void supabase.storage.from(BUCKETS.languageAudio).remove([path]);
        throw error;
      }
      if (v.wake || !isAsleep(partner?.timezone)) {
        void notifyPartner({
          kind: 'lesson',
          title: `«${v.word}»`,
          body: `${self?.display_name ?? 'Your love'} said it for you — listen`,
          url: `/language/dictionary?word=${v.vocabId}&lang=${v.lang}`,
          tag: `voice:${v.vocabId}`,
        });
      }
      return data as Voice;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) =>
      void qc.invalidateQueries({ queryKey: qk.lang.voice(v.vocabId) }),
  });
}

/** Take a recording of your own back. */
export function useDeleteVoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Voice) => {
      const { error } = await supabase
        .from('lang_voice')
        .delete()
        .eq('id', row.id);
      if (error) throw error;
      void supabase.storage
        .from(BUCKETS.languageAudio)
        .remove([row.audio_path]);
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, row) =>
      void qc.invalidateQueries({ queryKey: qk.lang.voice(row.vocab_id) }),
  });
}
