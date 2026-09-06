import { useEffect, useRef } from 'react';
import { supabase } from '@kernel/supabase';
import { BUCKETS, proxyPath } from '@kernel/storage';
import { usePolaroids } from '@features/polaroid';
import { useChalkNotes } from '@features/chalkboard';

// On open, warm only the handful you'd actually see first. The Polaroid route
// prefetches the rest of the page the moment you arrive, so pulling two dozen
// here just competes with whatever the couple actually tapped.
// The service worker (sw.ts) caches each fetched image under a token-agnostic
// key, so warmed photos survive a cold boot offline too.
const PRELOAD = 5;

// Every in-app currency. One USD fetch yields all cross rates.
const RATE_CODES = ['USD', 'CLP', 'RUB', 'GEL', 'TRY', 'EUR'] as const;
const RATE_STALE_MS = 8 * 60 * 60 * 1000; // refresh only when ≥8h old
/** Directed pairs we expect to exist: every ordered (from, to), from ≠ to. */
const EXPECTED_PAIRS = RATE_CODES.length * (RATE_CODES.length - 1);

/**
 * Refresh the WHOLE FX matrix from one free, keyless USD fetch - but only when
 * the stored rates are stale. `open.er-api` gives `perUsd[X]` (X per 1 USD), so
 * a cross rate X→Y = perUsd[Y]/perUsd[X]; we upsert every directed pair so the
 * converter's *direct* lookup is always current (no stale seed row survives -
 * that was the "rates don't match Google" bug). Member RLS permits the write.
 */
async function refreshRatesIfStale(): Promise<void> {
  try {
    // TWO reasons to refresh, and both matter:
    //  • age - the OLDEST pair, so seeded cross-rates a prior USD-only refresh
    //    never touched still force a run (the d12db8f fix).
    //  • COUNT - adding a currency to RATE_CODES creates pairs that have never
    //    existed. Age alone would early-return while every existing row is
    //    fresh, and the new currency would silently never appear. That is
    //    exactly how EUR would have shipped dead.
    const [{ data: oldest }, { count }] = await Promise.all([
      supabase
        .from('currency_rates')
        .select('fetched_at')
        .order('fetched_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('currency_rates')
        .select('*', { count: 'exact', head: true }),
    ]);
    const age = oldest?.fetched_at
      ? Date.now() - new Date(oldest.fetched_at).getTime()
      : Infinity;
    const complete = (count ?? 0) >= EXPECTED_PAIRS;
    if (age < RATE_STALE_MS && complete) return;

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

/**
 * Sign a batch of proxies in ONE request and pull them into the image cache.
 *
 * This used to be a `for … await createSignedUrl` loop - 24 sequential
 * round-trips on every cold open, competing with whatever the couple actually
 * tapped. `createSignedUrls` signs the lot at once.
 */
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
        const targets = key.split('|').map(proxyPath);
        const { data } = await supabase.storage
          .from(bucket)
          .createSignedUrls(targets, 3600);
        if (cancelled || !data) return;
        for (const row of data) {
          // A missing proxy (legacy photo) comes back with a null url, not a
          // throw - skip it and let the full image load on demand.
          if (!row?.signedUrl) continue;
          const img = new Image();
          // CORS, or the worker sees an opaque response and keeps nothing -
          // this warmer had never stored a single byte.
          img.crossOrigin = 'anonymous';
          img.src = row.signedUrl;
        }
      })();
    // Defer warming until after first paint - this must not compete with the
    // content the couple actually opened.
    const t = window.setTimeout(start, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [bucket, key]);
}

/**
 * Opens the app warm. The moment we're authenticated, quietly fetch the data
 * behind the screens the couple is most likely to open next - the wall,
 * tonight's questions, the polaroids - and pull recent photo proxies into the
 * image cache, so tapping in paints instantly instead of spinning. Renders
 * nothing; it just primes the React-Query cache (and, via the persister, the
 * next cold boot too).
 *
 * The Summer trip + its photos used to be warmed here. That trip is over and
 * the feature is locked, so it was two wasted queries and a signed-URL sweep on
 * every single boot.
 */
export function CacheWarmer() {
  const { data: polaroids } = usePolaroids();
  useChalkNotes();

  // Quietly keep FX fresh on open - a tiny staleness check, and only an actual
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

  return null;
}
