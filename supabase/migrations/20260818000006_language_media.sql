-- ════════════════════════════════════════════════════════════════════════
-- Katitos — the material that comes with a lesson
--
--   A PDF worksheet, a Word document, a photograph, a YouTube video, a link.
--   A row is EITHER a file we store OR a link somewhere else, never both —
--   the CHECK says so, because "which one is it" being ambiguous is how a
--   media list ends up with rows nothing can render.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.lang_media (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.lang_courses (id) on delete cascade,
  lesson_id uuid references public.lang_lessons (id) on delete cascade,
  kind text not null check (kind in ('pdf', 'doc', 'image', 'audio', 'youtube', 'link')),
  title text,
  storage_path text,
  url text,
  mime text,
  size_bytes int,
  duration_ms int,
  poster_path text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  constraint lang_media_source_chk check (
    (storage_path is not null and url is null) or
    (url is not null and storage_path is null)
  )
);
create index if not exists lang_media_course_idx on public.lang_media (course_id);
create index if not exists lang_media_lesson_idx on public.lang_media (lesson_id);

alter table public.lang_media enable row level security;
drop policy if exists members_all on public.lang_media;
create policy members_all on public.lang_media for all
  using (public.is_member()) with check (public.is_member());
alter table public.lang_media replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'lang_media'
  ) then
    alter publication supabase_realtime add table public.lang_media;
  end if;
end $$;

-- ── the bucket her worksheets live in ─────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('language-media', 'language-media', false)
on conflict (id) do nothing;

drop policy if exists "language-media members read"   on storage.objects;
drop policy if exists "language-media members insert" on storage.objects;
drop policy if exists "language-media members update" on storage.objects;
drop policy if exists "language-media members delete" on storage.objects;

create policy "language-media members read" on storage.objects for select
  using (bucket_id = 'language-media' and public.is_member());
create policy "language-media members insert" on storage.objects for insert
  with check (bucket_id = 'language-media' and public.is_member());
create policy "language-media members update" on storage.objects for update
  using (bucket_id = 'language-media' and public.is_member());
create policy "language-media members delete" on storage.objects for delete
  using (bucket_id = 'language-media' and public.is_member());
