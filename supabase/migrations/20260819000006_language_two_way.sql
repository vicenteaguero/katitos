-- ════════════════════════════════════════════════════════════════════════
-- Katitos - the classroom goes both ways
--
--   The dictionary was built to hold a word in three languages with one of
--   them marked as the one being taught (`term_lang`) - and then `ru` was made
--   NOT NULL, which forces every Spanish word's headword into a column called
--   `ru`. That is exactly the lie the column comment warned about, and the
--   backfill walked straight into it: the five words on production are
--   Manzana / Naranja / Plátano / Pera / Sandía, all `term_lang = 'es'`, all
--   with the Spanish word sitting in `ru`. The app filters the dictionary by
--   `term_lang = 'ru'`, so those five have been invisible since the day they
--   were migrated.
--
--   She teaches him Russian; he teaches her Spanish. Both directions are
--   first-class from here.
--
--   ── Safe while the old bundle is still running ──
--   The previous build only ever writes `term_lang = 'ru'` with a non-empty
--   `ru`, so dropping the NOT NULL takes nothing away from it and the new
--   CHECK cannot reject anything it sends. The rows repaired below are ones it
--   already refuses to show.
-- ════════════════════════════════════════════════════════════════════════

-- ── the headword lives in the column its language names ───────────────────
alter table public.lang_vocab alter column ru drop not null;

-- She reads Russian. A Spanish word explained to her had nowhere to put the
-- explanation: there was notes_en and notes_es and nothing in her own language.
alter table public.lang_vocab add column if not exists notes_ru text;

-- ── repair what the backfill mislabelled ──────────────────────────────────
-- The word was copied into both `ru` and its real column: drop the copy.
update public.lang_vocab
   set ru = null
 where term_lang = 'es'
   and ru is not null
   and es is not null
   and lower(btrim(ru)) = lower(btrim(es));

-- The word was only ever in `ru`: move it where it belongs.
update public.lang_vocab
   set es = btrim(ru), ru = null
 where term_lang = 'es'
   and ru is not null
   and (es is null or btrim(es) = '');

update public.lang_vocab
   set en = coalesce(nullif(btrim(en), ''), btrim(ru)), ru = null
 where term_lang = 'en'
   and ru is not null;

-- ── and make the mistake unrepresentable ──────────────────────────────────
-- Whatever `term_lang` says, THAT column has to hold something. Without this
-- the app can write a word with no headword at all and only find out when a
-- lesson renders an empty card.
alter table public.lang_vocab drop constraint if exists lang_vocab_headword_check;
alter table public.lang_vocab add constraint lang_vocab_headword_check
  check (
    btrim(coalesce(
      case term_lang when 'ru' then ru when 'es' then es else en end, ''
    )) <> ''
  );

-- The Russian lookup index had a Spanish twin missing.
create index if not exists lang_vocab_es_idx on public.lang_vocab (lower(es));
create index if not exists lang_vocab_term_lang_idx on public.lang_vocab (term_lang);
