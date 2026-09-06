-- ════════════════════════════════════════════════════════════════════════
-- Katitos - Russian, taught properly
--
--   Anastasia teaches for a living. Until now this app gave her a flashcard
--   box: a deck, some cards, a spaced-repetition queue. That is a study aid,
--   not a course. She wants what she uses at work - a course made of units,
--   units made of lessons, and lessons that can be homework or an exam.
--
--   Three tables, one idea: a lesson is an ORDERED LIST OF BLOCKS. A block is
--   a paragraph, a set of words, a video, or an exercise. Adding a new kind of
--   block later is a client change, not a migration.
--
--   ── Trilingual by construction ──
--   Every piece of prose carries `_ru`, `_en` and `_es` columns. She writes a
--   lesson once in Russian and English; filling in the Spanish later turns the
--   same lesson into her own Spanish practice, and nothing about the layout
--   moves because every language sits in the same slot.
--
--   Nothing here touches `phrases`, `language_decks` or `phrase_reviews`.
--   The old screens keep working while the app is upgraded.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.lang_courses (
  id uuid primary key default gen_random_uuid(),
  target_lang text not null default 'ru' check (target_lang in ('ru', 'es', 'en')),
  title text not null,
  emoji text,
  description text,
  cover_path text,
  position int not null default 0,
  archived boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lang_courses_order_idx
  on public.lang_courses (archived, position, created_at);

-- A unit is a chapter: "Getting around", "The past tense".
create table if not exists public.lang_units (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.lang_courses (id) on delete cascade,
  title text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists lang_units_course_idx
  on public.lang_units (course_id, position);

-- One `kind` column instead of three near-identical tables - and it means she
-- can promote a lesson to homework by changing one field.
create table if not exists public.lang_lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.lang_units (id) on delete cascade,
  kind text not null default 'lesson' check (kind in ('lesson', 'homework', 'exam')),
  title text not null,
  subtitle text,
  position int not null default 0,
  -- Draft means she is still writing it; he only ever sees 'published'.
  status text not null default 'draft' check (status in ('draft', 'published')),
  due_on date,
  est_minutes int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lang_lessons_unit_idx
  on public.lang_lessons (unit_id, position);
create index if not exists lang_lessons_due_idx
  on public.lang_lessons (status, due_on);

create table if not exists public.lang_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lang_lessons (id) on delete cascade,
  position int not null default 0,
  kind text not null check (kind in ('text', 'vocab', 'media', 'exercise', 'divider')),
  -- The SAME paragraph in each language. Prose belongs here and nowhere else:
  -- text hidden inside `data` is text the language switch cannot reach.
  body_ru text,
  body_en text,
  body_es text,
  -- Non-linguistic settings only: a media id, a tag filter, a layout hint.
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lang_blocks_lesson_idx
  on public.lang_blocks (lesson_id, position);

do $$
declare t text;
begin
  foreach t in array array['lang_courses', 'lang_units', 'lang_lessons', 'lang_blocks'] loop
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

drop trigger if exists lang_courses_updated_at on public.lang_courses;
create trigger lang_courses_updated_at before update on public.lang_courses
  for each row execute function public.set_updated_at();
drop trigger if exists lang_lessons_updated_at on public.lang_lessons;
create trigger lang_lessons_updated_at before update on public.lang_lessons
  for each row execute function public.set_updated_at();
drop trigger if exists lang_blocks_updated_at on public.lang_blocks;
create trigger lang_blocks_updated_at before update on public.lang_blocks
  for each row execute function public.set_updated_at();
