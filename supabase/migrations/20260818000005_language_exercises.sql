-- ════════════════════════════════════════════════════════════════════════
-- Katitos — exercises, homework and marks
--
--   The kinds she asked for: choose, choose several, type it, fill the gap,
--   put it in order, match the pairs, listen, say it. Each one needs a
--   different shape of question, so the question lives in `payload` (jsonb)
--   and is validated in the client against a zod schema that IS unit-tested.
--   Adding a ninth kind of exercise is then a client change — which matters,
--   because the service worker means a migration can never be assumed to have
--   reached both phones.
--
--   `lang_attempts` deliberately has NO unique constraint. The generic deck
--   engine already in this app is `unique(card_id, user_id)` — one answer,
--   forever — which is exactly wrong for homework you are meant to redo until
--   you get it right.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.lang_exercises (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lang_lessons (id) on delete cascade,
  block_id uuid references public.lang_blocks (id) on delete cascade,
  position int not null default 0,
  kind text not null check (kind in (
    'choice', 'multi', 'type', 'complete', 'order', 'match', 'listen', 'speak'
  )),
  prompt_ru text,
  prompt_en text,
  prompt_es text,
  -- Per-kind shape: options, gap templates, token lists, pairs.
  payload jsonb not null default '{}'::jsonb,
  answer jsonb,
  points int not null default 1,
  media_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lang_exercises_lesson_idx
  on public.lang_exercises (lesson_id, position);

create table if not exists public.lang_attempts (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.lang_exercises (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  attempt_no int not null default 1,
  answer jsonb not null,
  correct boolean,
  score real,
  answered_at timestamptz not null default now()
);
create index if not exists lang_attempts_exercise_idx
  on public.lang_attempts (exercise_id, user_id, answered_at desc);

-- What she reads when she marks his homework.
create table if not exists public.lang_lesson_progress (
  lesson_id uuid not null references public.lang_lessons (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'submitted', 'graded')),
  score real,
  submitted_at timestamptz,
  graded_at timestamptz,
  teacher_note text,
  updated_at timestamptz not null default now(),
  primary key (lesson_id, user_id)
);

alter table public.lang_exercises enable row level security;
drop policy if exists members_all on public.lang_exercises;
create policy members_all on public.lang_exercises for all
  using (public.is_member()) with check (public.is_member());

-- Same split as the reviews: she sees his answers, but only he writes them.
alter table public.lang_attempts enable row level security;
drop policy if exists members_all on public.lang_attempts;
drop policy if exists lang_attempts_select on public.lang_attempts;
drop policy if exists lang_attempts_write on public.lang_attempts;
create policy lang_attempts_select on public.lang_attempts for select
  using (public.is_member());
create policy lang_attempts_write on public.lang_attempts for all
  using (public.is_member() and user_id = auth.uid())
  with check (public.is_member() and user_id = auth.uid());

-- Progress is the one place the TEACHER writes on the student's row: the mark
-- and the note in the margin are hers to leave.
alter table public.lang_lesson_progress enable row level security;
drop policy if exists members_all on public.lang_lesson_progress;
create policy members_all on public.lang_lesson_progress for all
  using (public.is_member()) with check (public.is_member());

do $$
declare t text;
begin
  foreach t in array array['lang_exercises', 'lang_attempts', 'lang_lesson_progress'] loop
    execute format('alter table public.%I replica identity full;', t);
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

drop trigger if exists lang_exercises_updated_at on public.lang_exercises;
create trigger lang_exercises_updated_at before update on public.lang_exercises
  for each row execute function public.set_updated_at();
drop trigger if exists lang_lesson_progress_updated_at on public.lang_lesson_progress;
create trigger lang_lesson_progress_updated_at before update on public.lang_lesson_progress
  for each row execute function public.set_updated_at();
