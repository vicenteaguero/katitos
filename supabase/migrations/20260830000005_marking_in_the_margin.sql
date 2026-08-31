-- ════════════════════════════════════════════════════════════════════════
-- Katitos — marking in the margin
--
--   Her verdict used to be one number and one note for the whole lesson.
--   Now every answer can carry her own tick or cross (`teacher_score`) and
--   a word in the margin (`teacher_note`); a lesson can be sent back for
--   another go (`returned`); and the app remembers when he last opened a
--   lesson (`opened_at`), so she knows he has seen it before the call.
--
--   All additive. The bundle still running until the next launch never
--   reads the new columns, and it shows a `returned` lesson as open for
--   answering — which is exactly what returned means.
-- ════════════════════════════════════════════════════════════════════════

alter table public.lang_attempts
  add column if not exists teacher_score real
    check (teacher_score is null or (teacher_score >= 0 and teacher_score <= 1)),
  add column if not exists teacher_note text;

-- An attempt is his to write and hers to mark. The row stays his; the two
-- margin columns may be written by either member. Column privileges do the
-- narrowing — an update that touches anything else is refused before the
-- policy is even consulted, so nobody can rewrite an answer after the fact.
revoke update on public.lang_attempts from authenticated;
grant update (teacher_score, teacher_note) on public.lang_attempts to authenticated;
drop policy if exists lang_attempts_mark on public.lang_attempts;
create policy lang_attempts_mark on public.lang_attempts for update
  using (public.is_member()) with check (public.is_member());

alter table public.lang_lesson_progress
  add column if not exists opened_at timestamptz;

alter table public.lang_lesson_progress
  drop constraint if exists lang_lesson_progress_status_check;
alter table public.lang_lesson_progress
  add constraint lang_lesson_progress_status_check
  check (status in ('not_started', 'in_progress', 'submitted', 'graded', 'returned'));
