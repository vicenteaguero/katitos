-- Album stickers gain rotation (two-finger rotate) + a 'text' source so you can
-- drop titles / subtitles / little messages on a page (image_path stays null).
alter table public.album_photos
  add column if not exists rotation real not null default 0;

alter table public.album_photos drop constraint if exists album_photos_source_check;
alter table public.album_photos
  add constraint album_photos_source_check
  check (source in ('upload', 'polaroid', 'text'));
