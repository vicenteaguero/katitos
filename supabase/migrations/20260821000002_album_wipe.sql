-- ════════════════════════════════════════════════════════════════════════
-- Katitos — the albums start again
--
--   Asked for, deliberately: the books that exist were built while the
--   engine underneath them was changing shape twice a week, and they carry
--   the scars — pages that come back after you tear them out, photos with
--   no size, placements from three different sticker models. Tonight the
--   Georgia & Türkiye book gets made from nothing, and it deserves nothing
--   to be made from.
--
--   WHAT SURVIVES: every daily polaroid and every bouquet. They live in
--   their own buckets and their own tables and are not touched here. A
--   library row whose source is 'polaroid' only ever POINTED at the
--   polaroids bucket — deleting the row does not delete the picture.
--
--   DELETE, not TRUNCATE, on purpose:
--     • TRUNCATE does not replicate, so a phone with a book open would keep
--       showing an album that no longer exists until it happened to refetch.
--       DELETE fires real row events and the open app empties itself.
--     • TRUNCATE ... CASCADE follows foreign keys nobody wrote down here.
--       Deleting child-first names exactly what dies.
-- ════════════════════════════════════════════════════════════════════════

delete from public.album_placements;
delete from public.album_photos;
delete from public.album_pages;
delete from public.album_books;

-- ── the bytes are gone already ────────────────────────────────────────────
-- NOT from here: Supabase refuses direct deletes on `storage.objects`
-- ("Direct deletion from storage tables is not allowed"), and a migration
-- that tries it fails and takes the row wipe down with it. The `album`
-- bucket was emptied through the Storage API instead:
--
--     supabase storage rm -r ss:///album/book ss:///album/thumbs --linked
--
-- which also frees the actual bytes, where a `storage.objects` delete would
-- only have unlinked them and billed for them forever. `polaroids` and
-- `flowers` were listed before and after and are untouched.
