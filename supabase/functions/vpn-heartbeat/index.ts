// The only door her exit servers knock on.
//
// Every server posts one small object a minute. Nothing polls them from the
// outside on purpose: a poller would be a datacentre IP touching her endpoints
// on a schedule, once a minute, forever — which is the exact shape a censor
// looks for. So the boxes report in, and this writes it down.
//
// The door is a shared secret in a header, not a Supabase JWT. The servers hold
// no account and no anon key: if a box is seized or resold, the worst anyone
// gets is the ability to write fake uptime numbers for a server whose address
// they already had.
//
// Deploy:
//   supabase functions deploy vpn-heartbeat --no-verify-jwt
//   supabase secrets set VPN_BEAT_SECRET=<64 hex chars>
//
// `--no-verify-jwt` is required and is the point: the caller is a bash script
// on a VPS, not a signed-in phone.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

/** Beats older than this are a chart nobody will ever scroll back to. */
const PRUNE_DAYS = 8;
/** Prune on roughly one call in this many, instead of a second scheduled job. */
const PRUNE_ODDS = 500;

interface Beat {
  server_id: string;
  uptime_s?: number;
  load1?: number;
  mem_pct?: number;
  clients?: number;
  rx_bytes?: number;
  tx_bytes?: number;
}

/** Constant-time compare, so the secret cannot be walked out a byte at a time. */
function secretsMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const expected = Deno.env.get('VPN_BEAT_SECRET') ?? '';
  const given = req.headers.get('x-beat-secret') ?? '';
  // A missing secret in the environment must never mean "let everyone in".
  if (!expected || !secretsMatch(given, expected)) {
    return json({ error: 'nope' }, 401);
  }

  let beat: Beat;
  try {
    beat = await req.json();
  } catch {
    return json({ error: 'body' }, 400);
  }
  if (!beat?.server_id) return json({ error: 'server_id' }, 400);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // One row per minute, and the primary key is (server_id, at) — a clock that
  // fires twice in the same second must not be an error the box retries.
  const at = new Date();
  at.setSeconds(0, 0);

  const { error } = await admin.from('vpn_beats').upsert(
    {
      server_id: beat.server_id,
      at: at.toISOString(),
      uptime_s: num(beat.uptime_s),
      load1: num(beat.load1),
      mem_pct: num(beat.mem_pct),
      clients: num(beat.clients),
      rx_bytes: num(beat.rx_bytes),
      tx_bytes: num(beat.tx_bytes),
    },
    { onConflict: 'server_id,at' }
  );
  // An unknown server_id trips the foreign key. That is a typo in the box's
  // config, not an attack, and it should be loud in the server's own log.
  if (error) return json({ error: error.message }, 400);

  if (Math.random() < 1 / PRUNE_ODDS) {
    const cutoff = new Date(Date.now() - PRUNE_DAYS * 86400_000).toISOString();
    await admin.from('vpn_beats').delete().lt('at', cutoff);
  }

  return json({ ok: true });
});
