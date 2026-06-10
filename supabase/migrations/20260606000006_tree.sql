-- ════════════════════════════════════════════════════════════════════════
-- Katitos — Our Tree
-- A single shared living tree. Event-sourced: tree_waterings is the append-only
-- log; tree_state is a cache the water_tree() RPC maintains atomically. The
-- alternating-waterer rule (you can't water twice in a row) is enforced under a
-- row lock inside water_tree(). All display math (stage/height) is derived on
-- the client from tree_state.growth_points (authoritative).
-- ════════════════════════════════════════════════════════════════════════

-- Singleton tree (mirrors the public.couple "id boolean = true" pattern).
create table public.tree_state (
  id boolean primary key default true check (id),
  planted_at timestamptz not null default now(),
  seed bigint not null,
  last_watered_at timestamptz,
  last_watered_by uuid references auth.users (id),
  water_count integer not null default 0,
  growth_points numeric not null default 0, -- monotonic; authoritative for stage/height
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_streak_day date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger tree_state_updated_at before update on public.tree_state
  for each row execute function public.set_updated_at();

-- Append-only watering log (the source of truth).
create table public.tree_waterings (
  id uuid primary key default gen_random_uuid(),
  watered_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  watered_at timestamptz not null default now(),
  couple_day date not null,
  growth_added numeric not null default 0,
  health_before numeric,
  created_at timestamptz not null default now()
);
create index tree_waterings_at_idx on public.tree_waterings (watered_at desc);
create index tree_waterings_day_idx on public.tree_waterings (couple_day);

-- Milestones: permanent structures you can tap to revisit a moment.
create table public.tree_milestones (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('stage', 'height', 'streak', 'calendar', 'manual')),
  slot integer not null, -- deterministic anchor-segment id (hash of kind+threshold)
  threshold numeric, -- null for calendar/manual
  title text not null,
  note text,
  emoji text,
  achieved_at timestamptz not null default now(),
  couple_day date not null,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
-- Dedup: scalar milestones by (kind, threshold); calendar ones by (kind, couple_day).
create unique index tree_milestones_threshold_idx
  on public.tree_milestones (kind, threshold) where threshold is not null;
create unique index tree_milestones_calendar_idx
  on public.tree_milestones (kind, couple_day) where kind = 'calendar';

-- RLS ----------------------------------------------------------------------
alter table public.tree_state enable row level security;
alter table public.tree_waterings enable row level security;
alter table public.tree_milestones enable row level security;
create policy members_all on public.tree_state
  for all using (public.is_member()) with check (public.is_member());
create policy members_all on public.tree_waterings
  for all using (public.is_member()) with check (public.is_member());
create policy members_all on public.tree_milestones
  for all using (public.is_member()) with check (public.is_member());

-- Realtime (invalidate-only; no replica identity full needed) ---------------
alter publication supabase_realtime add table public.tree_state;
alter publication supabase_realtime add table public.tree_waterings;
alter publication supabase_realtime add table public.tree_milestones;

-- ════════════════════════════════════════════════════════════════════════
-- water_tree() — the ONLY way to water. Computes the couple-day server-side,
-- enforces the alternating rule atomically under a row lock, advances the
-- cache (growth/streak), and returns the new tree_state row. The growth/health
-- math here MUST mirror src/features/tree/lib/tree-growth.ts.
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.water_tree()
returns public.tree_state
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.tree_state;
  v_by uuid := auth.uid();
  v_day date;
  v_health numeric;
  v_added numeric;
  v_streak integer;
begin
  if v_by is null or not public.is_member() then
    raise exception 'not a member' using errcode = '42501';
  end if;

  -- Canonical couple-day = the EARLIER (MIN) of the two members' civil dates.
  v_day := (
    select min(date(now() at time zone coalesce(timezone, 'UTC')))
    from public.couple_members
  );

  -- Serialize concurrent waterings on the singleton row.
  select * into s from public.tree_state where id = true for update;
  if not found then
    raise exception 'tree not planted' using errcode = 'P0002';
  end if;

  -- THE CORE RULE: you cannot water twice in a row.
  if s.last_watered_by is not null and s.last_watered_by = v_by then
    raise exception 'not your turn' using errcode = 'P0001';
  end if;

  -- Health at the moment of watering (server clock). Gentle: 1-day half-life,
  -- floor 0.05. First water ever = full health.
  if s.last_watered_at is null then
    v_health := 1.0;
  else
    v_health := greatest(
      0.05,
      power(0.5, extract(epoch from (now() - s.last_watered_at)) / 86400.0)
    );
  end if;

  -- Growth points granted (mildly health-gated): 0.62 .. 1.0.
  v_added := 1.0 * (0.6 + 0.4 * v_health);

  -- Streak: +1 on a consecutive couple-day; unchanged on a same-day re-water;
  -- reset to 1 on a gap (or first ever).
  if s.last_streak_day is null then
    v_streak := 1;
  elsif v_day = s.last_streak_day then
    v_streak := s.current_streak;
  elsif v_day = s.last_streak_day + 1 then
    v_streak := s.current_streak + 1;
  else
    v_streak := 1;
  end if;

  insert into public.tree_waterings (watered_by, couple_day, growth_added, health_before)
  values (v_by, v_day, v_added, v_health);

  update public.tree_state set
    last_watered_at = now(),
    last_watered_by = v_by,
    water_count = water_count + 1,
    growth_points = growth_points + v_added,
    current_streak = v_streak,
    longest_streak = greatest(longest_streak, v_streak),
    last_streak_day = v_day
  where id = true
  returning * into s;

  return s;
end;
$$;

-- Plant the tree (idempotent). Aged from the relationship start; fixed seed.
insert into public.tree_state (id, planted_at, seed)
values (true, timestamptz '2024-08-15 00:00:00+00', 20240815)
on conflict (id) do nothing;
