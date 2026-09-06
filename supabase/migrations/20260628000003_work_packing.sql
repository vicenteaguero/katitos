-- ════════════════════════════════════════════════════════════════════════
-- Katitos - Summer Travel: shared Work calendar + Luggage checklist
--   • work_blocks: each partner's work time blocks, keyed by day. NOT
--     trip-scoped - it's a year-round shared weekly planner.
--   • packing_items: the trip packing list, check off before traveling.
--   New tables get the uniform members_all policy + live sync.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.work_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id),
  day date not null,
  start_min smallint not null check (start_min between 0 and 1440),
  end_min smallint not null check (end_min between 0 and 1440),
  title text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists work_blocks_day_idx on public.work_blocks (day);

create table if not exists public.packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  label text not null,
  category text,
  assigned_to uuid references auth.users (id),
  packed boolean not null default false,
  position int not null default 0,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
create index if not exists packing_items_trip_idx
  on public.packing_items (trip_id, category, position);

do $$
declare t text;
begin
  foreach t in array array['work_blocks', 'packing_items'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists members_all on public.%I;', t);
    execute format(
      'create policy members_all on public.%I for all using (public.is_member()) with check (public.is_member());',
      t);
    execute format('alter table public.%I replica identity full;', t);
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
