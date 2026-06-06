import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { BUCKETS, storagePaths, useUpload } from '@kernel/storage';
import { qk } from '@kernel/query';
import type { Lang } from '../types';

export interface CreatePhraseInput {
  language: Lang;
  text: string;
  translation?: string;
  transliteration?: string;
  example?: string;
  category?: string;
  audioBlob?: Blob | null;
}

export function useCreatePhrase() {
  const qc = useQueryClient();
  const { upload } = useUpload();
  return useMutation({
    mutationFn: async (input: CreatePhraseInput) => {
      const { data, error } = await supabase
        .from('phrases')
        .insert({
          language: input.language,
          text: input.text,
          translation: input.translation ?? null,
          transliteration: input.transliteration ?? null,
          example: input.example ?? null,
          category: input.category ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;
      const id = data.id;

      if (input.audioBlob) {
        const path = storagePaths.languageAudio(id);
        await upload(BUCKETS.languageAudio, path, input.audioBlob, {
          contentType: 'audio/webm',
        });
        const { error: upErr } = await supabase
          .from('phrases')
          .update({ audio_path: path })
          .eq('id', id);
        if (upErr) throw upErr;
      }
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: qk.phrases.list(vars.language) }),
  });
}

export function useDeletePhrase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; language: Lang }) => {
      const { error } = await supabase.from('phrases').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: qk.phrases.list(vars.language) }),
  });
}
