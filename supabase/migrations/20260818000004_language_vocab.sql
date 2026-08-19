-- ════════════════════════════════════════════════════════════════════════
-- Katitos — one dictionary, and it remembers
--
--   Words used to live inside a deck, so the same word taught in two lessons
--   was two rows that could disagree with each other. Now there is ONE entry
--   per word and a lesson simply points at it: fix a stress mark once and it
--   is fixed everywhere it was ever taught.
--
--   Everything already learned comes across. `phrase_reviews` holds real
--   history — how often he forgot a word, when it is next due — and throwing
--   that away would mean starting his Russian again from nothing.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.lang_vocab (
  id uuid primary key default gen_random_uuid(),
  -- Which of the three columns below is the WORD BEING TAUGHT. Almost always
  -- Russian — but he teaches her Spanish too, and without this the headword of
  -- a Spanish card would have to sit in a column called `ru`, which is a lie
  -- the rest of the app would then have to work around.
  term_lang text not null default 'ru' check (term_lang in ('ru', 'es', 'en')),
  ru text not null,
  en text,
  es text,
  transliteration text,
  -- Which syllable carries the stress. In Russian this is the difference
  -- between two different words, so it gets its own column.
  stress text,
  part_of_speech text,
  notes_en text,
  notes_es text,
  tags text[] not null default '{}',
  audio_path text,
  -- Where this word came from, so the backfill can run twice safely.
  legacy_phrase_id uuid unique references public.phrases (id) on delete set null,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lang_vocab_tags_idx on public.lang_vocab using gin (tags);
create index if not exists lang_vocab_ru_idx on public.lang_vocab (lower(ru));

-- A vocab block SELECTS from the dictionary rather than copying out of it.
create table if not exists public.lang_block_vocab (
  block_id uuid not null references public.lang_blocks (id) on delete cascade,
  vocab_id uuid not null references public.lang_vocab (id) on delete cascade,
  position int not null default 0,
  primary key (block_id, vocab_id)
);

-- Same shape as phrase_reviews: the scheduling maths in
-- src/features/language/lib/srs.ts is unchanged and still unit-tested.
create table if not exists public.lang_vocab_reviews (
  vocab_id uuid not null references public.lang_vocab (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ease real not null default 2.5 check (ease between 1.3 and 3.5),
  interval_days int not null default 0 check (interval_days >= 0),
  due_on date not null default current_date,
  reps int not null default 0,
  lapses int not null default 0,
  last_grade smallint check (last_grade between 0 and 2),
  last_seen_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (vocab_id, user_id)
);
create index if not exists lang_vocab_reviews_due_idx
  on public.lang_vocab_reviews (user_id, due_on);

-- ── bring every word and every review across ──────────────────────────────
-- Keyed on legacy_phrase_id, so running this again changes nothing.
insert into public.lang_vocab
  (term_lang, ru, es, en, transliteration, notes_es, audio_path,
   legacy_phrase_id, created_by, created_at)
select p.language,
       -- `ru` is the headword column and is NOT NULL, so it always carries the
       -- term; `term_lang` says what language that term is actually in.
       p.text,
       case when p.language = 'ru' then null else p.text end,
       -- The old `translation` column never recorded WHICH language it was in,
       -- and in practice everything written there is English. It goes to `en`
       -- rather than being guessed into `es`: the Spanish is hers to fill in,
       -- and until she does the reader falls back to English instead of being
       -- shown English wearing a Spanish label.
       p.translation,
       p.transliteration,
       coalesce(p.notes, p.example),
       p.audio_path,
       p.id,
       p.added_by,
       p.created_at
  from public.phrases p
 where not exists (
   select 1 from public.lang_vocab v where v.legacy_phrase_id = p.id
 );

insert into public.lang_vocab_reviews
  (vocab_id, user_id, ease, interval_days, due_on, reps, lapses, last_grade, last_seen_at)
select v.id, r.user_id, r.ease, r.interval_days, r.due_on, r.reps, r.lapses,
       r.last_grade, r.last_seen_at
  from public.phrase_reviews r
  join public.lang_vocab v on v.legacy_phrase_id = r.phrase_id
 where not exists (
   select 1 from public.lang_vocab_reviews x
    where x.vocab_id = v.id and x.user_id = r.user_id
 );

alter table public.lang_vocab enable row level security;
drop policy if exists members_all on public.lang_vocab;
create policy members_all on public.lang_vocab for all
  using (public.is_member()) with check (public.is_member());

alter table public.lang_block_vocab enable row level security;
drop policy if exists members_all on public.lang_block_vocab;
create policy members_all on public.lang_block_vocab for all
  using (public.is_member()) with check (public.is_member());

-- Both of us READ every review — she is the teacher and needs to see how he is
-- doing — but each of us only ever writes our own answers.
alter table public.lang_vocab_reviews enable row level security;
drop policy if exists members_all on public.lang_vocab_reviews;
drop policy if exists lang_vocab_reviews_select on public.lang_vocab_reviews;
drop policy if exists lang_vocab_reviews_write on public.lang_vocab_reviews;
create policy lang_vocab_reviews_select on public.lang_vocab_reviews for select
  using (public.is_member());
create policy lang_vocab_reviews_write on public.lang_vocab_reviews for all
  using (public.is_member() and user_id = auth.uid())
  with check (public.is_member() and user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['lang_vocab', 'lang_block_vocab', 'lang_vocab_reviews'] loop
    execute format('alter table public.%I replica identity full;', t);
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

drop trigger if exists lang_vocab_updated_at on public.lang_vocab;
create trigger lang_vocab_updated_at before update on public.lang_vocab
  for each row execute function public.set_updated_at();
drop trigger if exists lang_vocab_reviews_updated_at on public.lang_vocab_reviews;
create trigger lang_vocab_reviews_updated_at before update on public.lang_vocab_reviews
  for each row execute function public.set_updated_at();
