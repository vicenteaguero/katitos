-- ════════════════════════════════════════════════════════════════════════
-- Katitos - Language: decks ("a course your love built for you")
-- Words group into decks per language; each partner authors decks for the
-- other and plays them as a card game. Phrases gain an optional deck_id.
-- ════════════════════════════════════════════════════════════════════════

create table public.language_decks (
  id uuid primary key default gen_random_uuid(),
  language text not null check (language in ('ru', 'es')),
  title text not null,
  description text,
  emoji text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.phrases
  add column if not exists deck_id uuid references public.language_decks (id) on delete set null;
create index if not exists phrases_deck_idx on public.phrases (deck_id);

-- RLS: members do everything (same pattern as every feature table).
alter table public.language_decks enable row level security;
create policy members_all on public.language_decks
  for all using (public.is_member()) with check (public.is_member());

-- Realtime so a deck the partner builds appears live.
alter publication supabase_realtime add table public.language_decks;
