# Pending migrations — held back on purpose

Nothing is waiting right now.

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

- `20260814000001_wishlist_hidden_by_default.sql` — 2026-08-12. `wishlist_items`
  was empty, so nothing changed meaning.
- `20260814000002_language_ru_es_only.sql` — 2026-08-12. Removed the two seeded
  travel decks (Türkiye and Georgia, 28 cards from 2026-06-30, none hand-written)
  and tightened both language CHECKs to `('ru','es')`.
- `20260814000003_double_polaroid_phase3.sql` — 2026-08-12, **applied early on
  request** while one phone had opened the app only once since the release.
  Dropped `polaroids_day_key`; `(day, user_id)` is now the rule and two photos a
  day are possible. All 34 existing photos untouched.
