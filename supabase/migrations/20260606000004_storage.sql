-- ════════════════════════════════════════════════════════════════════════
-- Katitos - storage buckets + policies
-- All private. Members may do everything; outsiders nothing.
-- ════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values
  ('polaroids', 'polaroids', false),
  ('flowers', 'flowers', false),
  ('quiz-media', 'quiz-media', false),
  ('language-audio', 'language-audio', false),
  ('scavenger-proof', 'scavenger-proof', false),
  ('georgia-album', 'georgia-album', false),
  ('dates-album', 'dates-album', false),
  ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- One uniform set of policies scoped to our buckets.
create policy "members read objects" on storage.objects
  for select to authenticated
  using (
    bucket_id = any (
      array[
        'polaroids', 'flowers', 'quiz-media', 'language-audio',
        'scavenger-proof', 'georgia-album', 'dates-album', 'avatars'
      ]
    )
    and public.is_member()
  );

create policy "members insert objects" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = any (
      array[
        'polaroids', 'flowers', 'quiz-media', 'language-audio',
        'scavenger-proof', 'georgia-album', 'dates-album', 'avatars'
      ]
    )
    and public.is_member()
  );

create policy "members update objects" on storage.objects
  for update to authenticated
  using (
    bucket_id = any (
      array[
        'polaroids', 'flowers', 'quiz-media', 'language-audio',
        'scavenger-proof', 'georgia-album', 'dates-album', 'avatars'
      ]
    )
    and public.is_member()
  )
  with check (
    bucket_id = any (
      array[
        'polaroids', 'flowers', 'quiz-media', 'language-audio',
        'scavenger-proof', 'georgia-album', 'dates-album', 'avatars'
      ]
    )
    and public.is_member()
  );

create policy "members delete objects" on storage.objects
  for delete to authenticated
  using (
    bucket_id = any (
      array[
        'polaroids', 'flowers', 'quiz-media', 'language-audio',
        'scavenger-proof', 'georgia-album', 'dates-album', 'avatars'
      ]
    )
    and public.is_member()
  );
