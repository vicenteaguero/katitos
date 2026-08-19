import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { BUCKETS, storagePaths, useUpload } from '@kernel/storage';
import type { AudioClip } from '@kernel/ui';

interface CreateCuteWordInput {
  term: string;
  meaning?: string;
  example?: string;
  audio?: AudioClip | null;
}

export function useCreateCuteWord() {
  const qc = useQueryClient();
  const { upload } = useUpload();
  return useMutation({
    mutationFn: async ({
      term,
      meaning,
      example,
      audio,
    }: CreateCuteWordInput) => {
      const { data, error } = await supabase
        .from('cute_words')
        .insert({
          term,
          meaning: meaning || null,
          example: example || null,
        })
        .select('id')
        .single();
      if (error) throw error;

      if (audio) {
        const path = await upload(
          BUCKETS.languageAudio,
          storagePaths.languageAudio(data.id, audio.ext),
          audio.blob,
          { contentType: audio.mime }
        );
        const { error: updateError } = await supabase
          .from('cute_words')
          .update({ audio_path: path })
          .eq('id', data.id);
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.cuteWords.list() }),
  });
}

export function useDeleteCuteWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cute_words').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.cuteWords.list() }),
  });
}
