-- ════════════════════════════════════════════════════════════════════════
-- Katitos - four things the audit found, all of which lose something
--
--   1. Tearing out a page DELETED the photos on it. `album_photos.page_id`
--      still cascaded from the page it used to live on, and every photo that
--      predates the library split still carries that page_id - so every photo
--      in Pololini and Panini was one "tear out this page" away from being
--      gone, along with its stickers on OTHER pages. The whole point of the
--      library was that a page is an arrangement, not a container.
--
--   2. The self-heal could never see the rows it exists for. The previous
--      bundle writes `album_photos` with no `book_id` (the column is new), and
--      the heal filters on `book_id`. A photo added from the not-yet-upgraded
--      phone was invisible on the upgraded one - in the book AND in the strip -
--      and would have stayed invisible forever. A trigger fills it in instead,
--      whichever bundle did the writing.
--
--   3. A word could get stuck. `clampEase` floors at exactly 1.3, but the
--      CHECK compared a `real` against a `double precision` 1.3, and
--      1.3::real is 1.29999995 - just below. Six blanks in a row and that word
--      could never be graded again.
--
--   4. Deleting a lesson deleted its worksheets and left the files orphaned.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. a page is an arrangement, not a container ──────────────────────────
alter table public.album_photos drop constraint if exists album_photos_page_id_fkey;
alter table public.album_photos
  add constraint album_photos_page_id_fkey
  foreign key (page_id) references public.album_pages (id) on delete set null;

-- ── 2. a photo always knows which book it is in ───────────────────────────
create or replace function public.album_photo_book_from_page()
returns trigger language plpgsql as $$
begin
  if new.book_id is null and new.page_id is not null then
    select book_id into new.book_id from public.album_pages where id = new.page_id;
  end if;
  return new;
end $$;

drop trigger if exists album_photos_book_from_page on public.album_photos;
create trigger album_photos_book_from_page
  before insert or update of page_id on public.album_photos
  for each row execute function public.album_photo_book_from_page();

update public.album_photos p
   set book_id = pg.book_id
  from public.album_pages pg
 where pg.id = p.page_id and p.book_id is null;

-- ── a sticker taken off a page must STAY off ──────────────────────────────
-- The heal treats "has a page_id but no placement" as something to adopt,
-- which is precisely what taking a sticker off the page creates. Anything
-- already carrying a placement has been migrated, so its legacy page_id has
-- no further job.
update public.album_photos p
   set page_id = null
 where p.page_id is not null
   and exists (select 1 from public.album_placements a where a.photo_id = p.id);

-- ── 3. the floor the client actually produces must be allowed ─────────────
alter table public.lang_vocab_reviews drop constraint if exists lang_vocab_reviews_ease_check;
alter table public.lang_vocab_reviews
  add constraint lang_vocab_reviews_ease_check
  check (ease >= 1.3::real and ease <= 3.5::real);

alter table public.phrase_reviews drop constraint if exists phrase_reviews_ease_check;
alter table public.phrase_reviews
  add constraint phrase_reviews_ease_check
  check (ease >= 1.3::real and ease <= 3.5::real);

-- ── 4. losing a lesson must not lose the worksheet ────────────────────────
-- The file still belongs to the course; only its place in a lesson is gone.
alter table public.lang_media drop constraint if exists lang_media_lesson_id_fkey;
alter table public.lang_media
  add constraint lang_media_lesson_id_fkey
  foreign key (lesson_id) references public.lang_lessons (id) on delete set null;

-- An exercise's attachment was declared without ever saying what it points at.
alter table public.lang_exercises drop constraint if exists lang_exercises_media_id_fkey;
alter table public.lang_exercises
  add constraint lang_exercises_media_id_fkey
  foreign key (media_id) references public.lang_media (id) on delete set null;
