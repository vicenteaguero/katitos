import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import { supabase } from '@kernel/supabase';
import { qk } from '@kernel/query';
import { BUCKETS, storagePaths, useUpload } from '@kernel/storage';
import { toast } from '@kernel/ui';
import type { Media, MediaKind } from '../types';

/** Which of the six kinds a file is, from its type and its name. */
export function kindForFile(file: File): MediaKind {
  const type = file.type.toLowerCase();
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('audio/')) return 'audio';
  if (type === 'application/pdf') return 'pdf';
  if (/\.(docx?|odt|rtf|pages)$/i.test(file.name)) return 'doc';
  return 'doc';
}

const extOf = (name: string) =>
  name.includes('.') ? name.split('.').pop()!.toLowerCase() : 'bin';

/**
 * Everything ever attached in a course - the library a media block can pick
 * from, so a worksheet uploaded for lesson 3 is one tap away in lesson 9.
 */
export function useCourseMedia(courseId: string | undefined) {
  return useQuery({
    queryKey: qk.lang.media(courseId ?? 'none'),
    enabled: !!courseId,
    staleTime: 30_000,
    queryFn: async (): Promise<Media[]> => {
      const { data, error } = await supabase
        .from('lang_media')
        .select('*')
        .eq('course_id', courseId as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Media[];
    },
  });
}

/** Attach a worksheet, a photo, a recording. */
export function useUploadMedia() {
  const qc = useQueryClient();
  const { upload } = useUpload();
  return useMutation({
    mutationFn: async (v: {
      courseId: string;
      lessonId?: string | null;
      file: File;
      title?: string;
    }) => {
      const path = storagePaths.languageMedia(
        v.courseId,
        nanoid(10),
        extOf(v.file.name)
      );
      await upload(BUCKETS.languageMedia, path, v.file, {
        contentType: v.file.type || undefined,
      });
      const { data, error } = await supabase
        .from('lang_media')
        .insert({
          course_id: v.courseId,
          lesson_id: v.lessonId ?? null,
          kind: kindForFile(v.file),
          title: v.title?.trim() || v.file.name,
          storage_path: path,
          mime: v.file.type || null,
          size_bytes: v.file.size,
        })
        // The row comes back so the block can be told which attachment it owns.
        .select('*')
        .single();
      if (error) {
        // No row, no file: a refused insert used to leave the upload sitting
        // in the bucket with nothing pointing at it.
        void supabase.storage.from(BUCKETS.languageMedia).remove([path]);
        throw error;
      }
      return data as Media;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: qk.lang.media(v.courseId) });
      if (v.lessonId)
        void qc.invalidateQueries({ queryKey: qk.lang.lesson(v.lessonId) });
    },
  });
}

/**
 * The eleven-character id inside any shape of YouTube URL.
 *
 * Worth doing properly: she will paste whatever the app on her phone gave her,
 * which is a `youtu.be` short link about half the time.
 */
export function youtubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/live\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

/** Attach a video or a link - no upload, just an address. */
export function useAddLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      courseId: string;
      lessonId?: string | null;
      url: string;
      title?: string;
    }) => {
      const id = youtubeId(v.url);
      const { data, error } = await supabase
        .from('lang_media')
        .insert({
          course_id: v.courseId,
          lesson_id: v.lessonId ?? null,
          kind: id ? 'youtube' : 'link',
          title: v.title?.trim() || null,
          url: v.url.trim(),
          // The still frame, so a lesson full of videos still opens instantly -
          // the player itself is only loaded when someone taps it.
          poster_path: id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as Media;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: qk.lang.media(v.courseId) });
      if (v.lessonId)
        void qc.invalidateQueries({ queryKey: qk.lang.lesson(v.lessonId) });
    },
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { media: Media; courseId: string }) => {
      // The file first: a row that outlives its file is a broken link; a file
      // that outlives its row is only clutter.
      if (v.media.storage_path) {
        const { error: rmErr } = await supabase.storage
          .from(BUCKETS.languageMedia)
          .remove([v.media.storage_path]);
        if (rmErr) throw rmErr;
      }
      const { error } = await supabase
        .from('lang_media')
        .delete()
        .eq('id', v.media.id);
      if (error) throw error;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: qk.lang.media(v.courseId) });
      // The lesson carries its own attachments now, so it has to hear about it.
      if (v.media.lesson_id)
        void qc.invalidateQueries({
          queryKey: qk.lang.lesson(v.media.lesson_id),
        });
    },
  });
}
