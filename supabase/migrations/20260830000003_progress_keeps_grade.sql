-- ════════════════════════════════════════════════════════════════════════
-- Katitos — a marked lesson stays marked
--
--   Checking one answer again after she had graded the lesson wrote
--   `in_progress` and a null score over her row: her mark, her note's
--   context and the "Marked · 80%" he was shown all vanished, and the policy
--   on this table (both members may write any row, so that she can write his)
--   let it through. The client no longer sends that write — but a trigger
--   protects the bundle that is still running until the next launch too.
--
--   Silent on purpose: keep her fields and let the update carry on, rather
--   than raise into an error toast on his phone for doing his homework.
-- ════════════════════════════════════════════════════════════════════════

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
  end if;
  return new;
end;
$$;

drop trigger if exists lang_progress_keep_grade on public.lang_lesson_progress;
create trigger lang_progress_keep_grade
  before update on public.lang_lesson_progress
  for each row execute function public.lang_progress_keep_grade();
