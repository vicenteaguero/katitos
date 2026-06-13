import { useEffect, useRef } from 'react';
import { supabase } from '@kernel/supabase';
import { BUCKETS, proxyPath } from '@kernel/storage';
import { useGeorgiaTrip, useGeorgiaPhotos } from '@features/georgia';
import { usePolaroids } from '@features/polaroid';
import { useChalkNotes } from '@features/chalkboard';
import { useTodayQuestions, useEnsureToday } from '@features/know-me';

const PRELOAD = 8;

/** Sign each path's proxy and pull it into the browser image cache. */
function useImagePreload(
  bucket: (typeof BUCKETS)[keyof typeof BUCKETS],
  paths: string[]
) {
  const key = paths.slice(0, PRELOAD).join('|');
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    void (async () => {
      for (const path of key.split('|')) {
        const { data } = await supabase.storage
          .from(bucket)
          .createSignedUrl(proxyPath(path), 3600);
        if (cancelled) return;
        if (data?.signedUrl) {
          // Warm the HTTP cache; a 404 (legacy photo, no proxy) is harmless.
          const img = new Image();
          img.src = data.signedUrl;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bucket, key]);
}

/**
 * Opens the app warm. The moment we're authenticated, quietly fetch the data
 * behind the screens the couple is most likely to open next — the wall,
 * tonight's questions, the trip, the polaroids — and pull recent photo proxies
 * into the image cache, so tapping in paints instantly instead of spinning.
 * Renders nothing; it just primes the React-Query cache (and, via the
 * persister, the next cold boot too).
 */
export function CacheWarmer() {
  const { data: trip } = useGeorgiaTrip();
  const { data: polaroids } = usePolaroids();
  const { data: tripPhotos } = useGeorgiaPhotos(trip?.id);
  useChalkNotes();
  useTodayQuestions();

  // Provision today's Know-Me questions on open (idempotent), so Home shows
  // tonight's prompts without first having to visit the Know-Me tab.
  const ensure = useEnsureToday();
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    ensure.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImagePreload(
    BUCKETS.polaroids,
    (polaroids ?? []).map((p) => p.image_path)
  );
  useImagePreload(
    BUCKETS.georgiaAlbum,
    (tripPhotos ?? []).map((p) => p.image_path)
  );

  return null;
}
