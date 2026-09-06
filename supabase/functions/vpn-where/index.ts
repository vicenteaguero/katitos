// "Am I on it right now?"
//
// Takes the address the request arrives from and answers with a NAME, never
// with an address. That asymmetry is the whole design: the client learns
// "Helsinki" or "no", and nothing it could paste anywhere would help a censor.
//
// Runs with the caller's own JWT verified (unlike vpn-heartbeat) - this is a
// question only the two of them get to ask.
//
// Deploy:
//   supabase functions deploy vpn-where
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

/**
 * Every address in the chain, closest hop last.
 *
 * `x-forwarded-for` is a list appended to by each proxy, and which end holds
 * the true peer depends on the edge in front of us - a guess there would fail
 * silently and forever, always answering "not on the tunnel". So we compare
 * ALL of them and match on any.
 *
 * That would be forgeable if this were open: send the header, claim to be on
 * the tunnel. It is not open - the caller must already be one of the two of
 * them, and lying to yourself about your own VPN is not a threat model. An
 * internal hop can never collide, because it would have to equal one of our
 * servers' public addresses.
 */
function callerIps(req: Request): string[] {
  const xff = req.headers.get('x-forwarded-for') ?? '';
  const real = req.headers.get('x-real-ip') ?? '';
  return [...xff.split(','), real]
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only the two of them. The anon key alone is not enough - this needs a
  // signed-in user, and RLS on vpn_servers does the rest.
  const auth = req.headers.get('Authorization') ?? '';
  const asUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } } }
  );
  const { data: me } = await asUser.auth.getUser();
  if (!me?.user) return json({ error: 'nope' }, 401);
  const { data: member } = await asUser.rpc('is_member');
  if (member !== true) return json({ error: 'nope' }, 403);

  const ips = callerIps(req);
  if (ips.length === 0) return json({ on_tunnel: false, reason: 'no-ip' });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const { data, error } = await admin
    .from('vpn_server_addresses')
    .select('server_id, vpn_servers(label, city, country)')
    .in('ip', ips)
    .maybeSingle();

  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ on_tunnel: false });

  // Shape it the way the UI reads it: a place, not a machine.
  const s = data.vpn_servers as unknown as {
    label: string;
    city: string | null;
    country: string | null;
  } | null;
  return json({
    on_tunnel: true,
    label: s?.label ?? null,
    city: s?.city ?? null,
    country: s?.country ?? null,
  });
});
