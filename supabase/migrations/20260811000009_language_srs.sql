-- ════════════════════════════════════════════════════════════════════════
-- Katitos — Russian lessons that actually remember
--
--   She is an English teacher and is going to teach him properly. Until now
--   the feature was a flip card with "Again / Got it" whose answer was thrown
--   away the moment you left the screen — no memory, no progress, no way for
--   her to see what he keeps forgetting.
--
--   `phrase_reviews` is one row per (card, learner): when it is next due, how
--   well it's known, and how often it has been forgotten. The scheduling maths
--   lives in the client (src/features/language/lib/srs.ts) where it is unit
--   tested; this table just remembers the answer.
--
--   Turkish and Georgian are NOT dropped here. Migration 20260630000003 ran on
--   production and INSERTED tr/ka decks and phrases, so re-tightening the CHECK
--   would fail on live rows — and the old bundle can still write 'tr' during
--   the upgrade window. The UI stops offering them now; the data gets cleaned
--   up in a later, gated migration.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.phrase_reviews (
  phrase_id uuid not null references public.phrases (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- SM-2-ish: how easy this card is for this person (higher = easier).
  ease real not null default 2.5 check (ease between 1.3 and 3.5),
  interval_days int not null default 0 check (interval_days >= 0),
  due_on date not null default current_date,
  reps int not null default 0,
  lapses int not null default 0,
  -- 0 = blanked, 1 = shaky, 2 = knew it. The last answer, for her review list.
  last_grade smallint check (last_grade between 0 and 2),
  last_seen_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (phrase_id, user_id)
);

create index if not exists phrase_reviews_due_idx
  on public.phrase_reviews (user_id, due_on);

drop trigger if exists phrase_reviews_updated_at on public.phrase_reviews;
create trigger phrase_reviews_updated_at before update on public.phrase_reviews
  for each row execute function public.set_updated_at();

alter table public.phrase_reviews enable row level security;

drop policy if exists members_all           on public.phrase_reviews;
drop policy if exists phrase_reviews_select on public.phrase_reviews;
drop policy if exists phrase_reviews_write  on public.phrase_reviews;

-- Both of us READ every row: she is the teacher, and needs to see how he's
-- doing. But each of us only writes our own answers.
create policy phrase_reviews_select on public.phrase_reviews for select
  using (public.is_member());
create policy phrase_reviews_write on public.phrase_reviews for all
  using (public.is_member() and user_id = auth.uid())
  with check (public.is_member() and user_id = auth.uid());

alter table public.phrase_reviews replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'phrase_reviews'
  ) then
    alter publication supabase_realtime add table public.phrase_reviews;
  end if;
end $$;

-- ── teaching notes on a card ───────────────────────────────────────────────
-- Grammar, a case, a warning about stress — the things a teacher writes in the
-- margin. Shown on the answer side.
alter table public.phrases
  add column if not exists notes text,
  add column if not exists position int not null default 0;

-- ── rescue the orphaned seed phrases ───────────────────────────────────────
-- seed.sql inserted phrases with deck_id NULL, and every screen filters by
-- deck — so they have been invisible since the day decks were introduced.
-- Give them a home instead of leaving them stranded.
do $$
declare v_deck uuid;
begin
  if exists (select 1 from public.phrases where deck_id is null and language = 'ru') then
    select id into v_deck from public.language_decks
      where language = 'ru' and title = 'Starter' limit 1;
    if v_deck is null then
      insert into public.language_decks (language, title, emoji, description)
      values ('ru', 'Starter', '🌱', 'The first words, from before we had decks')
      returning id into v_deck;
    end if;
    update public.phrases set deck_id = v_deck
      where deck_id is null and language = 'ru';
  end if;
end $$;
