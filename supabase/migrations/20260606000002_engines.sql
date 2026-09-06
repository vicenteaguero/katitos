-- ════════════════════════════════════════════════════════════════════════
-- Katitos - reusable engines
-- ONE deck engine powers quizzes / this-or-that / would-you-rather / QOTD /
-- swipe wishlists. ONE game_scores table powers every game's leaderboard.
-- ════════════════════════════════════════════════════════════════════════

-- Deck engine ---------------------------------------------------------------
create table public.decks (
  id uuid primary key default gen_random_uuid(),
  slug text unique, -- optional stable id, e.g. 'qotd'
  kind text not null, -- 'image-quiz'|'audio-quiz'|'this-or-that'|'would-you-rather'|'qotd'
  mode text not null check (mode in ('quiz', 'compare', 'swipe')),
  title text not null,
  description text,
  reveal_when_both boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger decks_updated_at before update on public.decks
  for each row execute function public.set_updated_at();

create table public.deck_cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  position int not null default 0,
  -- { text?, imagePath?, audioPath?, options?: [{id,label,imagePath?}] }
  prompt jsonb not null default '{}'::jsonb,
  correct jsonb, -- quiz mode: the correct answer value
  created_at timestamptz not null default now()
);
create index deck_cards_deck_idx on public.deck_cards (deck_id, position);

create table public.deck_responses (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  card_id uuid not null references public.deck_cards (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  answer jsonb not null,
  correct boolean,
  answered_at timestamptz not null default now(),
  unique (card_id, user_id)
);
create index deck_responses_deck_idx on public.deck_responses (deck_id);

-- Games leaderboard ---------------------------------------------------------
create table public.game_scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  score numeric not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index game_scores_board_idx on public.game_scores (game_id, score);

-- RLS -----------------------------------------------------------------------
alter table public.decks enable row level security;
alter table public.deck_cards enable row level security;
alter table public.deck_responses enable row level security;
alter table public.game_scores enable row level security;

create policy members_all on public.decks
  for all using (public.is_member()) with check (public.is_member());
create policy members_all on public.deck_cards
  for all using (public.is_member()) with check (public.is_member());
create policy members_all on public.deck_responses
  for all using (public.is_member()) with check (public.is_member());
create policy members_all on public.game_scores
  for all using (public.is_member()) with check (public.is_member());

-- Realtime: reveal-on-both-answered.
alter table public.deck_responses replica identity full;
alter publication supabase_realtime add table public.deck_responses;
