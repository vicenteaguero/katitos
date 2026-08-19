import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { BUCKETS, storagePaths, useUpload } from '@kernel/storage';
import { toast, type AudioClip } from '@kernel/ui';
import type { Letter } from '../types';

/**
 * The thirty-three letters, in order.
 *
 * Seeded by their migration rather than by seed.sql, so they exist on the real
 * app and not only on a freshly reset local database.
 */
export function useAlphabet(script = 'cyrillic') {
  return useQuery({
    queryKey: [...qk.lang.alphabet(), script] as const,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Letter[]> => {
      const { data, error } = await supabase
        .from('lang_alphabet')
        .select('*')
        .eq('script', script)
        .order('position', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Record a letter in her own voice.
 *
 * The point of doing this in the app rather than shipping a sound file: a
 * stranger saying Ы is worth much less than his teacher saying it.
 */
export function useRecordLetter() {
  const qc = useQueryClient();
  const { upload } = useUpload();
  return useMutation({
    mutationFn: async (v: { id: string; audio: AudioClip }) => {
      const path = storagePaths.languageAudio(`alphabet/${v.id}`, v.audio.ext);
      await upload(BUCKETS.languageAudio, path, v.audio.blob, {
        contentType: v.audio.mime,
      });
      const { error } = await supabase
        .from('lang_alphabet')
        .update({ audio_path: path })
        .eq('id', v.id);
      if (error) throw error;
      return path;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (path, _v) => {
      void qc.invalidateQueries({ queryKey: qk.lang.alphabet() });
      // A re-recording reuses the same path, so the old signed URL would keep
      // playing the old sound.
      qc.removeQueries({
        queryKey: ['signed-url', BUCKETS.languageAudio, path],
      });
    },
  });
}
