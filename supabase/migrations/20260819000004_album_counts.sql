-- ════════════════════════════════════════════════════════════════════════
-- Katitos - count the photos in the database, not on the phone
--
--   The shelf's "12 photos" line fetched EVERY photo row of EVERY album and
--   counted them in JavaScript. PostgREST caps a response at 1000 rows, so
--   past a thousand photos the counts would quietly start going DOWN - which
--   reads as "photos are missing", the most alarming thing an album can say.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.album_photo_counts()
returns table (book_id uuid, photos bigint)
language sql
stable
security invoker
as $$
  select p.book_id, count(*)
    from public.album_photos p
   where p.book_id is not null
   group by p.book_id;
$$;
