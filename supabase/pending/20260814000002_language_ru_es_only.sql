-- ════════════════════════════════════════════════════════════════════════
-- Katitos — Turkish and Georgian leave the building
--
--   Migration 20260630000003 widened TWO check constraints and INSERTED the
--   trip decks, so those rows are live on production. Re-tightening the checks
--   while they exist fails, which is why the UI dropped them first and this
--   waits.
--
--   ⚠ THIS DELETES THE TRIP LANGUAGE DECKS AND THEIR CARDS.
--   Check what you'd be losing before running it:
--
--     select d.title, count(p.id)
--       from public.language_decks d
--       left join public.phrases p on p.deck_id = d.id
--      where d.language in ('tr','ka')
--      group by d.title;
--
--   If any of it is worth keeping, move those rows to a 'ru'/'es' deck first.
-- ════════════════════════════════════════════════════════════════════════

delete from public.phrases where language in ('tr', 'ka');
delete from public.language_decks where language in ('tr', 'ka');

alter table public.phrases drop constraint if exists phrases_language_check;
alter table public.phrases
  add constraint phrases_language_check check (language in ('ru', 'es'));

alter table public.language_decks drop constraint if exists language_decks_language_check;
alter table public.language_decks
  add constraint language_decks_language_check check (language in ('ru', 'es'));
