-- ════════════════════════════════════════════════════════════════════════
-- Katitos - "am I actually on it right now?"
--
--   The one question the status list cannot answer. Every dot can be green
--   while her phone is routing around the tunnel entirely, and she would have
--   no way to tell except by noticing what does not load.
--
--   Answering it means comparing the address she is coming from against the
--   addresses of our servers - and those addresses are the one thing
--   20260905000001 deliberately kept out of this database, because a leak of
--   Supabase must not be a leak of her tunnel.
--
--   So they live here instead, in a table with RLS on and NO POLICY AT ALL.
--   Every signed-in client sees an empty table; only the service role can read
--   it, and the only thing holding the service role is the `vpn-where` edge
--   function, which answers with a name and never with an address.
--
--   Hashing the address and comparing in the browser was the obvious shortcut
--   and it is not one: IPv4 is 32 bits, so a hash of an IP is a lookup table,
--   not a secret.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.vpn_server_addresses (
  server_id uuid primary key references public.vpn_servers (id) on delete cascade,
  ip        inet not null,
  updated_at timestamptz not null default now()
);

create index if not exists vpn_server_addresses_ip_idx
  on public.vpn_server_addresses (ip);

alter table public.vpn_server_addresses enable row level security;
-- Intentionally no policies. See above.
