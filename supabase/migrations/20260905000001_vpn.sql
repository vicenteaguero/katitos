-- ════════════════════════════════════════════════════════════════════════
-- Katitos — her exit servers, and whether they are alive
--
--   Katitos is NOT part of her connection. It does not hand out configs, it
--   does not proxy anything, and if it is down her internet does not notice.
--   All this schema does is answer three questions when things already work:
--
--     · which servers exist, and which one is she meant to be on
--     · did each one report in recently
--     · what has uptime looked like this week
--
--   ── What is deliberately NOT here ───────────────────────────────────────
--   The server ADDRESSES. No hostname, no IP, no port, no key. A leak of this
--   database must not be a leak of her tunnel. `label` and `city` are enough
--   to render a dashboard, and they are worth nothing to anyone else.
--
--   The one secret that does live here is her subscription URL, in
--   `vpn_clients`, and that row is readable ONLY by the user it belongs to —
--   not by the partner, unlike everything else in this app.
-- ════════════════════════════════════════════════════════════════════════

-- The servers she can exit through ------------------------------------------
create table if not exists public.vpn_servers (
  id          uuid primary key default gen_random_uuid(),
  -- What she sees. "Helsinki", "Casa, Curicó".
  label       text not null,
  city        text,
  -- ISO 3166-1 alpha-2, for the little flag. Never her own country.
  country     text check (country is null or country ~ '^[A-Z]{2}$'),
  -- 'primary'  — the rented VPS she should normally be on
  -- 'standby'  — a second rented box in an unrelated range
  -- 'home'     — the Lenovo in Curicó. Slow, but a residential IP that bulk
  --              sweeps of datacentre ranges do not touch
  role        text not null default 'standby'
                check (role in ('primary', 'standby', 'home')),
  -- Which transports this box actually serves: 'xhttp', 'reality', 'awg'.
  protocols   text[] not null default '{}',
  -- Order in her list, which is also the failover order.
  sort        int not null default 100,
  -- Retired = burned, or turned off. Kept, never deleted: the uptime history
  -- is the record of how long that range lasted, which is how we pick the next.
  retired_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- One row per minute per server, written by the server itself ---------------
-- Append-only, pruned to 8 days by the heartbeat function. Two purposes: the
-- newest row is "is it alive right now", and the week of rows behind it is the
-- uptime bar. Nothing outside the servers ever writes here.
create table if not exists public.vpn_beats (
  server_id  uuid not null references public.vpn_servers (id) on delete cascade,
  at         timestamptz not null default now(),
  -- Seconds the box has been up. A reset to near-zero is a reboot, which is a
  -- different story from a gap in the beats (which is a block, or a dead box).
  uptime_s   bigint,
  -- 1-minute load average, and RAM in use, so a box dying of memory is visible
  -- before it stops answering entirely.
  load1      real,
  mem_pct    real,
  -- How many client connections the proxy currently holds. Hers is one device
  -- or three; a jump means the config walked somewhere it should not have.
  clients    int,
  -- Cumulative bytes as the proxy counts them. Differences between rows give
  -- the throughput line; absolute values are meaningless across reboots.
  rx_bytes   bigint,
  tx_bytes   bigint,
  primary key (server_id, at)
);

create index if not exists vpn_beats_at_idx on public.vpn_beats (at desc);

-- Her subscription, and mine ------------------------------------------------
-- The URL her client polls hourly for an updated server list. It IS a secret:
-- anyone holding it holds her tunnel. Hence the per-user policy below.
--
-- The URL is served by the VPN infrastructure, never by Katitos — Katitos does
-- not load from Russia without a tunnel, so it is unreachable at exactly the
-- moment a new list would be needed. This column is a convenience for showing
-- her a QR when things already work, and nothing more.
create table if not exists public.vpn_clients (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  label      text not null default 'iPhone',
  sub_url    text,
  -- Bumped when the config is re-issued, so the UI can say "reissued today".
  issued_at  timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.vpn_servers enable row level security;
alter table public.vpn_beats   enable row level security;
alter table public.vpn_clients enable row level security;

-- Both of us see the fleet and its health.
create policy members_read on public.vpn_servers
  for select using (public.is_member());
create policy members_read on public.vpn_beats
  for select using (public.is_member());

-- Writes to servers and beats come from the service role only (the heartbeat
-- function, and me). No insert/update policy on purpose — service role bypasses
-- RLS, every signed-in client is read-only here.

-- A subscription URL is the one thing in this app that is NOT shared. She sees
-- hers, I see mine, neither sees the other's: her config is revocable alone,
-- and that only means something if it is also hers alone.
create policy own_row on public.vpn_clients
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Health, already reduced -----------------------------------------------------
-- The dashboard asks one question and gets one row per server. Doing the
-- windowing here keeps the client from pulling a week of beats over her
-- connection, which is the resource this whole project is about.
create or replace function public.vpn_status()
returns table (
  id          uuid,
  label       text,
  city        text,
  country     text,
  role        text,
  protocols   text[],
  sort        int,
  last_beat   timestamptz,
  -- Alive = it reported in within the last three minutes. The beat is every
  -- minute, so this survives one lost minute without crying wolf.
  alive       boolean,
  clients     int,
  load1       real,
  mem_pct     real,
  uptime_24h  real,
  uptime_7d   real
)
language sql
stable
security definer
set search_path = public
as $$
  with latest as (
    select distinct on (b.server_id)
           b.server_id, b.at, b.clients, b.load1, b.mem_pct
      from public.vpn_beats b
     where b.at > now() - interval '7 days'
     order by b.server_id, b.at desc
  ),
  -- Uptime = beats received / beats expected, capped at 1. A minute with no
  -- beat is a minute the box could not reach Supabase, which from her side is
  -- indistinguishable from down, and is the honest thing to count as down.
  windows as (
    select b.server_id,
           count(*) filter (where b.at > now() - interval '24 hours') as n24,
           count(*) filter (where b.at > now() - interval '7 days')   as n7
      from public.vpn_beats b
     where b.at > now() - interval '7 days'
     group by b.server_id
  )
  select s.id, s.label, s.city, s.country, s.role, s.protocols, s.sort,
         l.at,
         l.at is not null and l.at > now() - interval '3 minutes',
         l.clients, l.load1, l.mem_pct,
         least(1.0, coalesce(w.n24, 0) / 1440.0)::real,
         least(1.0, coalesce(w.n7, 0) / 10080.0)::real
    from public.vpn_servers s
    left join latest  l on l.server_id = s.id
    left join windows w on w.server_id = s.id
   where s.retired_at is null
     and public.is_member()
   order by s.sort, s.label;
$$;

grant execute on function public.vpn_status() to authenticated;
