import { useEffect, useRef } from 'react';
import { supabase } from '@kernel/supabase';
import { BUCKETS, proxyPath } from '@kernel/storage';
import { useSummerTrip, useSummerPhotos } from '@features/summer';
import { usePolaroids } from '@features/polaroid';
import { useChalkNotes } from '@features/chalkboard';
import { useTodayQuestions, useEnsureToday } from '@features/know-me';

// Warm enough recent photos that travel + polaroid feel instant on flaky
// internet. The service worker (sw.ts) caches each fetched image under a
// token-agnostic key, so warmed photos also survive a cold boot offline.
const PRELOAD = 24;

// Which USD-based pairs to refresh. The converter triangulates through USD, so
// these cover every in-app conversion (RUB·CLP·GEL·TRY) — including TRY, which
// the server-side function omits.
const RATE_QUOTES = ['CLP', 'RUB', 'GEL', 'TRY'] as const;

/**
 * Pull fresh FX rates from a free, keyless API and upsert the shared
 * `currency_rates` table (member RLS permits the write). Best-effort; on any
 * failure the rates just stay as they were.
 */
async function refreshRates(): Promise<void> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const json = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
    };
    if (json.result !== 'success' || !json.rates) return;
    const rates = json.rates;
    const fetched_at = new Date().toISOString();
    const rows = RATE_QUOTES.filter((q) => typeof rates[q] === 'number').map(
      (q) => ({ base: 'USD', quote: q, rate: rates[q], fetched_at })
    );
    if (rows.length)
      await supabase
        .from('currency_rates')
        .upsert(rows, { onConflict: 'base,quote' });
  } catch {
    /* best-effort */
  }
}

/** Sign each path's proxy and pull it into the browser image cache. */
function useImagePreload(
  bucket: (typeof BUCKETS)[keyof typeof BUCKETS],
  paths: string[]
) {
  const key = paths.slice(0, PRELOAD).join('|');
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const start = () =>
      void (async () => {
        for (const path of key.split('|')) {
          if (cancelled) return;
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
    // Defer warming until after first paint — these signed-url round-trips must
    // not compete with the content the couple actually opened.
    const t = window.setTimeout(start, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
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
  const { data: trip } = useSummerTrip();
  const { data: polaroids } = usePolaroids();
  const { data: tripPhotos } = useSummerPhotos(trip?.id);
  useChalkNotes();
  useTodayQuestions();

  // Provision today's Know-Me questions on open (idempotent), so Home shows
  // tonight's prompts without first having to visit the Know-Me tab.
  const ensure = useEnsureToday();
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    // Push the provisioning RPC off the synchronous mount path so it doesn't
    // contend with the first render.
    const t = window.setTimeout(() => ensure.mutate(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ~1 in 4 opens, quietly refresh exchange rates in the background. Cheap,
  // shared, no schedule — the converter reads the table so rates self-update.
  const ratesFired = useRef(false);
  useEffect(() => {
    if (ratesFired.current) return;
    ratesFired.current = true;
    if (Math.random() >= 0.25) return;
    const t = window.setTimeout(() => void refreshRates(), 0);
    return () => clearTimeout(t);
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
