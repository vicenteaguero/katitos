# Pending migrations — held back on purpose

## Waiting

- `20260830000004_language_two_way_repair.sql` — 2026-08-30. In every Spanish
  course, moves the Spanish sentences out of `body_ru`, the Russian
  explanations out of `body_en` (blocks, prompts and table headings) into the
  columns they belong in. **Gate: both phones on the bundle with the fixed
  writers (`make db-gate`)** — the old builder writes the columns the wrong way
  round on every blur, so a repair under it is undone by the next edit. Guarded
  by Cyrillic checks and idempotent, so running it twice changes nothing.

- `20260830000001_drop_retired_features.sql` — 2026-08-30. Drops the 13 tables
  behind the features deleted in the same cleanup (Tier B and C, plus the long
  dead `scavenger_arguments`). **Gate: none technical — every table was verified
  empty on production with exact `count(*)`, and the code that touched them is
  already gone.** It waits because dropping a table is irreversible and nobody
  has asked for the space back. Move it to `migrations/` only on a deliberate
  decision. The app is correct with these tables sitting empty forever.

This folder exists for migrations that are **valid and tested but must not run
yet** — `make db-push` applies everything in `supabase/migrations/`, so anything
needing a human check goes here first, with its gate written down.

The gate that matters in this app is almost always the same one: the service
worker deliberately does not `skipWaiting`, so after a deploy the PREVIOUS JS
bundle keeps running until the app is launched again. A migration the old bundle
cannot survive has to wait for both phones. `make db-gate` shows who is ready —
note it takes **two** opens to count, because the first only installs the new
bundle and the second is when it starts running.

## Applied

- `20260819000007_album_legacy_drop.sql` — 2026-08-19. Dropped `album_photos.page_id`
  / `slot`, the `(page_id, slot)` unique index, the `album_photos_book_from_page`
  trigger, and the three dead sticker tables. **Its gates were waived on
  request** — and the reason they mattered went away in the same release: the
  app now takes a new version by itself at launch, so nobody is left running a
  bundle that still writes those columns. The migration adopts any leftover
  page-pinned photo into a placement itself rather than trusting the client
  heal, which is deleted in the same push.

- `20260814000001_wishlist_hidden_by_default.sql` — 2026-08-12. `wishlist_items`
  was empty, so nothing changed meaning.
- `20260814000002_language_ru_es_only.sql` — 2026-08-12. Removed the two seeded
  travel decks (Türkiye and Georgia, 28 cards from 2026-06-30, none hand-written)
  and tightened both language CHECKs to `('ru','es')`.
- `20260814000003_double_polaroid_phase3.sql` — 2026-08-12, **applied early on
  request** while one phone had opened the app only once since the release.
  Dropped `polaroids_day_key`; `(day, user_id)` is now the rule and two photos a
  day are possible. All 34 existing photos untouched.
