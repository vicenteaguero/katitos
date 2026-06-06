import { useCallback, useState } from 'react';
import { supabase } from '@kernel/supabase';
import type { BucketName } from './buckets';

interface UploadOptions {
  upsert?: boolean;
  contentType?: string;
}

/** Upload a Blob/File to a bucket path. Returns the stored path. */
export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (
      bucket: BucketName,
      path: string,
      file: Blob,
      opts: UploadOptions = {}
    ): Promise<string> => {
      setUploading(true);
      setError(null);
      try {
        const { error: upErr } = await supabase.storage
          .from(bucket)
          .upload(path, file, {
            upsert: opts.upsert ?? true,
            contentType:
              opts.contentType ||
              (file instanceof File ? file.type : undefined),
          });
        if (upErr) throw upErr;
        return path;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Upload failed';
        setError(msg);
        throw e;
      } finally {
        setUploading(false);
      }
    },
    []
  );

  return { upload, uploading, error };
}
