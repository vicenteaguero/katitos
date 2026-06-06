-- ════════════════════════════════════════════════════════════════════════
-- Katitos — feature tables
-- One (or a few) tables per feature. All gate on public.is_member() via the
-- uniform policy applied in the DO block at the bottom.
-- ════════════════════════════════════════════════════════════════════════

-- Countdowns ----------------------------------------------------------------
create table public.countdowns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  target_at timestamptz not null,
  emoji text,
  notes text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Flowers tracker (monthsversary, 15th of each month) -----------------------
create table public.flowers (
  id uuid primary key default gen_random_uuid(),
  occasion_date date not null unique, -- the monthsversary day
  image_path text,
  note text,
  given_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

-- Fight timer ---------------------------------------------------------------
create table public.fights (
  id uuid primary key default gen_random_uuid(),
  reason text,
  started_at timestamptz not null default now(),
  ended_at timestamptz, -- null = still going
  started_by uuid default auth.uid() references auth.users (id),
  resolution text,
  created_at timestamptz not null default now()
);

-- Puñito (pinky promise) ----------------------------------------------------
create table public.punitos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  level text not null default 'soft' check (level in ('soft', 'serious')),
  status text not null default 'proposed'
    check (status in ('proposed', 'sealed', 'broken')),
  proposed_by uuid not null default auth.uid() references auth.users (id),
  sealed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Big decisions + each member's stance --------------------------------------
create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'agreed')),
  agreed_value text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.decision_positions (
  decision_id uuid not null references public.decisions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position text not null,
  note text,
  updated_at timestamptz not null default now(),
  primary key (decision_id, user_id)
);

-- Baby names ----------------------------------------------------------------
create table public.baby_names (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gender text check (gender in ('girl', 'boy', 'any')),
  meaning text,
  origin text,
  notes text,
  proposed_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
create table public.baby_name_votes (
  name_id uuid not null references public.baby_names (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  primary key (name_id, user_id)
);

-- Cute words dictionary -----------------------------------------------------
create table public.cute_words (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  meaning text,
  example text,
  audio_path text,
  coined_by uuid default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

-- LDR idea bank -------------------------------------------------------------
create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text,
  status text not null default 'idea' check (status in ('idea', 'planned', 'done')),
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Finance goals + contributions ---------------------------------------------
create table public.finance_goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  target_amount numeric not null check (target_amount >= 0),
  currency text not null default 'USD',
  target_date date,
  notes text,
  archived boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.finance_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.finance_goals (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id),
  amount numeric not null,
  note text,
  contributed_at timestamptz not null default now()
);

-- Trips (next-travel planner + Georgia) -------------------------------------
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  slug text unique, -- e.g. 'georgia-2026'
  name text not null,
  destination text,
  start_date date,
  end_date date,
  budget_amount numeric,
  budget_currency text default 'USD',
  cover_path text,
  notes text,
  is_special boolean not null default false, -- Georgia hub
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.trip_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  kind text not null default 'idea'
    check (kind in ('idea', 'place', 'todo', 'game', 'tracker', 'note')),
  title text not null,
  description text,
  link text,
  status text not null default 'open' check (status in ('open', 'done')),
  position int not null default 0,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

-- Date log ------------------------------------------------------------------
create table public.dates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  place text,
  category text,
  status text not null default 'idea'
    check (status in ('idea', 'scheduled', 'done', 'cancelled')),
  scheduled_at timestamptz,
  budget_amount numeric,
  budget_currency text default 'USD',
  what_we_ate text,
  notes text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.date_ratings (
  date_id uuid not null references public.dates (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  stars smallint check (stars between 1 and 5),
  review text,
  updated_at timestamptz not null default now(),
  primary key (date_id, user_id)
);
create table public.date_photos (
  id uuid primary key default gen_random_uuid(),
  date_id uuid not null references public.dates (id) on delete cascade,
  image_path text not null,
  caption text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

-- Daily polaroid (one per day, overwritable) --------------------------------
create table public.polaroids (
  id uuid primary key default gen_random_uuid(),
  day date not null unique,
  image_path text not null,
  caption text,
  taken_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Georgia date-card scavenger -----------------------------------------------
create table public.scavenger_cards (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips (id) on delete set null,
  title text not null,
  description text,
  points int not null default 1,
  position int not null default 0,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
create table public.scavenger_claims (
  card_id uuid primary key references public.scavenger_cards (id) on delete cascade,
  claimed_by uuid not null default auth.uid() references auth.users (id),
  image_path text,
  note text,
  claimed_at timestamptz not null default now()
);
create table public.scavenger_arguments (
  card_id uuid not null references public.scavenger_cards (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  primary key (card_id, user_id)
);

-- Tinder-style wishlists ----------------------------------------------------
create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  description text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.wishlists (id) on delete cascade,
  title text not null,
  description text,
  image_path text,
  link text,
  added_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);
create table public.wishlist_votes (
  item_id uuid not null references public.wishlist_items (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  voted_at timestamptz not null default now(),
  primary key (item_id, user_id)
);

-- Infinite chalkboard wall --------------------------------------------------
create table public.chalkboard_notes (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  color text not null default '#f4f4f6',
  x numeric not null default 0,
  y numeric not null default 0,
  rotation numeric not null default 0,
  author uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

-- Language learning phrases -------------------------------------------------
create table public.phrases (
  id uuid primary key default gen_random_uuid(),
  language text not null check (language in ('ru', 'es')),
  text text not null,
  translation text,
  transliteration text,
  example text,
  audio_path text,
  category text,
  added_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

-- ── updated_at triggers for tables that have the column ──
create trigger countdowns_updated_at before update on public.countdowns
  for each row execute function public.set_updated_at();
create trigger punitos_updated_at before update on public.punitos
  for each row execute function public.set_updated_at();
create trigger decisions_updated_at before update on public.decisions
  for each row execute function public.set_updated_at();
create trigger ideas_updated_at before update on public.ideas
  for each row execute function public.set_updated_at();
create trigger finance_goals_updated_at before update on public.finance_goals
  for each row execute function public.set_updated_at();
create trigger trips_updated_at before update on public.trips
  for each row execute function public.set_updated_at();
create trigger dates_updated_at before update on public.dates
  for each row execute function public.set_updated_at();
create trigger polaroids_updated_at before update on public.polaroids
  for each row execute function public.set_updated_at();

-- ── RLS: uniform "members do everything" across every feature table ──
do $$
declare
  t text;
  tables text[] := array[
    'countdowns','flowers','fights','punitos','decisions','decision_positions',
    'baby_names','baby_name_votes','cute_words','ideas','finance_goals',
    'finance_contributions','trips','trip_items','dates','date_ratings',
    'date_photos','polaroids','scavenger_cards','scavenger_claims',
    'scavenger_arguments','wishlists','wishlist_items','wishlist_votes',
    'chalkboard_notes','phrases'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'create policy members_all on public.%I for all using (public.is_member()) with check (public.is_member());',
      t
    );
  end loop;
end;
$$;

-- Realtime: live chalkboard wall.
alter table public.chalkboard_notes replica identity full;
alter publication supabase_realtime add table public.chalkboard_notes;
