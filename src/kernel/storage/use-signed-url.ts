import { useQuery } from '@tanstack/react-query';
import { supabase } from '@kernel/supabase';
import type { BucketName } from './buckets';

/** Resolve a signed URL for a private-bucket object path. */
export function useSignedUrl(
  bucket: BucketName,
  path: string | null | undefined,
  expiresIn = 3600
) {
  return useQuery({
    queryKey: ['signed-url', bucket, path],
    enabled: !!path,
    staleTime: Math.max(0, (expiresIn - 60) * 1000),
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path as string, expiresIn);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
