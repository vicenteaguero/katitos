-- ════════════════════════════════════════════════════════════════════════
-- Katitos - Pololini Album (a Panini sticker album, for life)
-- Catalog (chapters + slots) is immutable shared content. Filled stickers are
-- couple data (photos in the 'album' bucket). One photo per slot-half; duo
-- slots take two halves ('a'/'b'); normal slots use 'solo'.
-- ════════════════════════════════════════════════════════════════════════

-- Chapters (created_by NULLABLE - catalog is couple-agnostic).
create table public.album_chapters (
  id uuid primary key default gen_random_uuid(),
  position smallint not null,
  slug text not null unique,
  title text not null,
  subtitle text,
  emoji text,
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
create index album_chapters_pos_idx on public.album_chapters (position);

-- Slots = the "stickers to collect" (life-experience prompts).
create table public.album_slots (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.album_chapters (id) on delete cascade,
  position smallint not null, -- catalog < 1000, custom >= 1000
  title text not null,
  hint text,
  tier text not null default 'common' check (tier in ('common', 'rare', 'foil')),
  is_duo boolean not null default false,
  gate_start_doy smallint check (gate_start_doy between 1 and 366),
  gate_end_doy smallint check (gate_end_doy between 1 and 366),
  gate_label text,
  source text not null default 'catalog' check (source in ('catalog', 'custom')),
  created_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  -- paging index AND catalog idempotency key
  unique (chapter_id, position)
);

-- Filled stickers. One row per (slot, half); swap overwrites in place.
create table public.album_stickers (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.album_slots (id) on delete cascade,
  half text not null default 'solo' check (half in ('solo', 'a', 'b')),
  image_path text not null,
  caption text,
  location text,
  taken_on date,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slot_id, half)
);
create index album_stickers_slot_idx on public.album_stickers (slot_id);
create trigger album_stickers_updated_at before update on public.album_stickers
  for each row execute function public.set_updated_at();

-- RLS ----------------------------------------------------------------------
alter table public.album_chapters enable row level security;
alter table public.album_slots enable row level security;
alter table public.album_stickers enable row level security;
create policy members_all on public.album_chapters
  for all using (public.is_member()) with check (public.is_member());
create policy members_all on public.album_slots
  for all using (public.is_member()) with check (public.is_member());
create policy members_all on public.album_stickers
  for all using (public.is_member()) with check (public.is_member());

-- Realtime: stickers (partner fills) + slots (custom slots sync) -------------
alter publication supabase_realtime add table public.album_stickers;
alter publication supabase_realtime add table public.album_slots;

-- Storage bucket + its OWN per-bucket policies (never editing …0004) --------
insert into storage.buckets (id, name, public) values ('album', 'album', false)
  on conflict (id) do nothing;
create policy "album members read" on storage.objects for select to authenticated
  using (bucket_id = 'album' and public.is_member());
create policy "album members insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'album' and public.is_member());
create policy "album members update" on storage.objects for update to authenticated
  using (bucket_id = 'album' and public.is_member())
  with check (bucket_id = 'album' and public.is_member());
create policy "album members delete" on storage.objects for delete to authenticated
  using (bucket_id = 'album' and public.is_member());
