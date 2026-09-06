-- ════════════════════════════════════════════════════════════════════════
-- Katitos - the spare profile, next to the main one
--
--   The design was always two unrelated ways in, and one column could only
--   ever hold one of them. `sub_url` is the profile she uses; `alt_url` is the
--   one she switches to when the first stops establishing - which, per every
--   post-mortem of the 2026 blocking waves, is a question of when.
--
--   Both are secrets in the strict sense: whoever holds one holds her tunnel.
--   The per-user policy from 20260905000001 already covers this column - she
--   sees hers, I see mine, neither sees the other's.
--
--   AmneziaWG deliberately does NOT live here. It is the path that has to work
--   when everything else has failed, including this app, so it is handed over
--   once as a QR and never depends on a round trip to Supabase.
-- ════════════════════════════════════════════════════════════════════════

alter table public.vpn_clients
  add column if not exists alt_url text;

comment on column public.vpn_clients.sub_url is
  'Main profile. The one to enable.';
comment on column public.vpn_clients.alt_url is
  'Spare profile, unrelated transport. The tap she makes when the main one dies.';
