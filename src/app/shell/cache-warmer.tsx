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

// Every in-app currency. One USD fetch yields all cross rates.
const RATE_CODES = ['USD', 'CLP', 'RUB', 'GEL', 'TRY'] as const;
const RATE_STALE_MS = 8 * 60 * 60 * 1000; // refresh only when ≥8h old

/**
 * Refresh the WHOLE FX matrix from one free, keyless USD fetch — but only when
 * the stored rates are stale. `open.er-api` gives `perUsd[X]` (X per 1 USD), so
 * a cross rate X→Y = perUsd[Y]/perUsd[X]; we upsert every directed pair so the
 * converter's *direct* lookup is always current (no stale seed row survives —
 * that was the "rates don't match Google" bug). Member RLS permits the write.
 */
async function refreshRatesIfStale(): Promise<void> {
  try {
    const { data: newest } = await supabase
      .from('currency_rates')
      .select('fetched_at')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const age = newest?.fetched_at
      ? Date.now() - new Date(newest.fetched_at).getTime()
      : Infinity;
    if (age < RATE_STALE_MS) return;

    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const json = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
    };
    if (json.result !== 'success' || !json.rates) return;
    const perUsd = json.rates;
    const fetched_at = new Date().toISOString();
    const rows: {
      base: string;
      quote: string;
      rate: number;
      fetched_at: string;
    }[] = [];
    for (const from of RATE_CODES)
      for (const to of RATE_CODES) {
        if (from === to) continue;
        const a = perUsd[from];
        const b = perUsd[to];
        if (typeof a === 'number' && a > 0 && typeof b === 'number')
          rows.push({ base: from, quote: to, rate: b / a, fetched_at });
      }
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

  // Quietly keep FX fresh on open — a tiny staleness check, and only an actual
  // fetch+upsert when the rates are ≥8h old. Background, no perf hit.
  const ratesFired = useRef(false);
  useEffect(() => {
    if (ratesFired.current) return;
    ratesFired.current = true;
    const t = window.setTimeout(() => void refreshRatesIfStale(), 0);
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
