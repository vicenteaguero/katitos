-- ════════════════════════════════════════════════════════════════════════
-- Katitos — a draft belongs to whoever is writing it
--
--   `20260818000003` says "he only ever sees 'published'", and nothing
--   enforced it: every lesson was readable by both of us, so half-written
--   lessons showed up in his list and opened. There was no way to enforce it
--   either — the table never recorded WHO was writing.
--
--   Both of them teach (she teaches him Russian, he teaches her Spanish), so
--   this is per-author rather than per-role. Additive with a default, so the
--   older bundle keeps inserting exactly as it does now.
-- ════════════════════════════════════════════════════════════════════════

alter table public.lang_lessons
  add column if not exists created_by uuid default auth.uid()
    references auth.users (id) on delete set null;

-- Everything that already exists belongs to whoever made its course.
update public.lang_lessons l
   set created_by = c.created_by
  from public.lang_units u
  join public.lang_courses c on c.id = u.course_id
 where u.id = l.unit_id and l.created_by is null;
