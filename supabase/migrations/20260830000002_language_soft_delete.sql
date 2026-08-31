-- ════════════════════════════════════════════════════════════════════════
-- Katitos — a word is put away, not destroyed
--
--   Deleting a word from the dictionary was one tap, and it took the
--   recording, every lesson's link to the word and BOTH people's review
--   history with it (the cascades below it are correct — they are what make
--   a real delete a real delete). Nothing can put that back.
--
--   So a delete now marks the row and every list stops showing it. The toast
--   offers Undo for nine seconds; the row can be unmarked at any time after.
--   The same column goes on lessons, for the day a lesson can be deleted from
--   the app at all.
--
--   Additive. The bundle that is still running until the next launch does not
--   know the column and keeps showing a put-away word for one session, which
--   is harmless. It never writes the column, so nothing it does can un-delete.
-- ════════════════════════════════════════════════════════════════════════

alter table public.lang_vocab
  add column if not exists deleted_at timestamptz;

alter table public.lang_lessons
  add column if not exists deleted_at timestamptz;

-- Every list asks for the live words of one language; make that the cheap
-- path rather than a scan that then throws the put-away ones out.
create index if not exists lang_vocab_live_idx
  on public.lang_vocab (term_lang)
  where deleted_at is null;
