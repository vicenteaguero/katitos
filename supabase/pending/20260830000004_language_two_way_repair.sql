-- ════════════════════════════════════════════════════════════════════════
-- Katitos — the Spanish course's Russian, filed under English
--
--   The lesson builder assumed Russian was always the language being taught:
--   its first box always wrote `body_ru`, and its "explanation" box wrote
--   `body_es` when the explanation was Spanish and `body_en` otherwise —
--   "otherwise" including Russian. So in a Spanish course the Spanish sentence
--   went into `body_ru` and her Russian explanation into `body_en`; the
--   exercise editor did the same with prompts, and the table editor with
--   headings. The writers are fixed. This puts the rows they wrote right.
--
--   Idempotent, and guarded by the script itself: only text with Cyrillic
--   moves INTO a Russian column, only text without it moves OUT of one, and
--   nothing overwrites a column that already has something in it.
--
--   GATE — run only when BOTH phones are on the bundle with the fixed writers
--   (`make db-gate`). The old bundle writes the columns the wrong way round on
--   every blur, so repairing under it would be undone by the next edit.
-- ════════════════════════════════════════════════════════════════════════

-- 1. Spanish text that was saved as Russian → the Spanish column.
update public.lang_blocks b
   set body_es = b.body_ru,
       body_ru = null
  from public.lang_lessons l
  join public.lang_units u on u.id = l.unit_id
  join public.lang_courses c on c.id = u.course_id
 where b.lesson_id = l.id
   and c.target_lang = 'es'
   and b.body_es is null
   and b.body_ru is not null
   and b.body_ru !~ '[А-Яа-яЁё]';

-- 2. Russian explanations that were saved as English → the Russian column.
update public.lang_blocks b
   set body_ru = b.body_en,
       body_en = null
  from public.lang_lessons l
  join public.lang_units u on u.id = l.unit_id
  join public.lang_courses c on c.id = u.course_id
 where b.lesson_id = l.id
   and c.target_lang = 'es'
   and b.body_ru is null
   and b.body_en ~ '[А-Яа-яЁё]';

-- 3. The same for question prompts.
update public.lang_exercises e
   set prompt_ru = e.prompt_en,
       prompt_en = null
  from public.lang_lessons l
  join public.lang_units u on u.id = l.unit_id
  join public.lang_courses c on c.id = u.course_id
 where e.lesson_id = l.id
   and c.target_lang = 'es'
   and e.prompt_ru is null
   and e.prompt_en ~ '[А-Яа-яЁё]';

-- 4. Table headings: an `en` heading holding Cyrillic becomes `ru`.
update public.lang_blocks b
   set data = jsonb_set(
         b.data,
         '{headings}',
         (
           select coalesce(jsonb_agg(
             case
               when (h ->> 'en') ~ '[А-Яа-яЁё]' and h ->> 'ru' is null
                 then (h - 'en') || jsonb_build_object('ru', h ->> 'en')
               else h
             end
           ), '[]'::jsonb)
           from jsonb_array_elements(b.data -> 'headings') as h
         )
       )
  from public.lang_lessons l
  join public.lang_units u on u.id = l.unit_id
  join public.lang_courses c on c.id = u.course_id
 where b.lesson_id = l.id
   and b.kind = 'table'
   and c.target_lang = 'es'
   and jsonb_typeof(b.data -> 'headings') = 'array';
