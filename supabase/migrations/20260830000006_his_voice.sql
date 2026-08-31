-- ════════════════════════════════════════════════════════════════════════
-- Katitos — his voice
--
--   Until now the only voice in the classroom was hers. A `speak` question
--   asked him to say the word and mark himself, and she never heard it.
--
--   `lang_voice` is a recording of one word by one of us: his try, or her
--   answer to it (`reply_to`). The study card, the dictionary and her
--   "what he keeps forgetting" list all read and write it. Alongside, her
--   own voice can sit on any answer she marks and on the whole lesson.
--
--   All additive; the running bundle never reads any of it.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.lang_voice (
  id uuid primary key default gen_random_uuid(),
  vocab_id uuid not null references public.lang_vocab (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  audio_path text not null,
  reply_to uuid references public.lang_voice (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists lang_voice_vocab_idx
  on public.lang_voice (vocab_id, created_at desc);

-- Both of us hear every recording; each of us only writes our own.
alter table public.lang_voice enable row level security;
drop policy if exists lang_voice_select on public.lang_voice;
drop policy if exists lang_voice_write on public.lang_voice;
create policy lang_voice_select on public.lang_voice for select
  using (public.is_member());
create policy lang_voice_write on public.lang_voice for all
  using (public.is_member() and user_id = auth.uid())
  with check (public.is_member() and user_id = auth.uid());

do $$
begin
  execute 'alter table public.lang_voice replica identity full';
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lang_voice'
  ) then
    execute 'alter publication supabase_realtime add table public.lang_voice';
  end if;
end $$;

-- Her voice on one answer, and on the whole lesson.
alter table public.lang_attempts
  add column if not exists teacher_audio_path text;
grant update (teacher_audio_path) on public.lang_attempts to authenticated;

alter table public.lang_lesson_progress
  add column if not exists teacher_audio_path text;

-- A marked lesson keeps her voice note too when he practises it again.
create or replace function public.lang_progress_keep_grade()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'graded'
     and new.status in ('not_started', 'in_progress', 'submitted') then
    new.status := old.status;
    new.score := old.score;
    new.graded_at := old.graded_at;
    new.submitted_at := old.submitted_at;
    new.teacher_note := old.teacher_note;
    new.teacher_audio_path := old.teacher_audio_path;
  end if;
  return new;
end;
$$;
