// Refreshes currency_rates from a free FX API. Intended to run on a schedule
// (Supabase cron) in the cloud; can be invoked manually locally. Optional —
// the app falls back to whatever rates are already seeded.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

// Must match RATE_CODES in src/app/shell/cache-warmer.tsx — the client is what
// actually keeps these fresh; this function is the manual/scheduled fallback.
const CURRENCIES = ['USD', 'CLP', 'RUB', 'GEL', 'TRY', 'EUR'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const rows: { base: string; quote: string; rate: number }[] = [];
  try {
    for (const base of CURRENCIES) {
      const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
      const data = await res.json();
      const rates = data?.rates ?? {};
      for (const quote of CURRENCIES) {
        if (quote === base) continue;
        if (typeof rates[quote] === 'number') {
          rows.push({ base, quote, rate: rates[quote] });
        }
      }
    }
  } catch (err) {
    return json({ error: String(err) }, 502);
  }

  if (rows.length) {
    const { error } = await admin.from('currency_rates').upsert(
      rows.map((r) => ({ ...r, fetched_at: new Date().toISOString() })),
      { onConflict: 'base,quote' }
    );
    if (error) return json({ error: error.message }, 500);
  }

  return json({ updated: rows.length });
});
