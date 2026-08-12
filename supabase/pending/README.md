# Pending migrations — held back on purpose

These files are **valid, tested migrations that must not run yet**. They live
here instead of `supabase/migrations/` for exactly one reason: `make db-push`
applies everything in that folder, and each of these needs a human check first.

Move a file into `supabase/migrations/` and run `make db-push` once its gate is
satisfied. Then delete its entry below.

---

## `20260813000001_double_polaroid_phase3.sql`

**Gate: both phones must be running the new JS bundle.**

The service worker deliberately does not `skipWaiting`, so after a deploy the
previous bundle keeps running for at least one more session. That old bundle
reads today's polaroid with `.maybeSingle()` and upserts with
`on_conflict=day`. The moment this migration drops `polaroids_day_key`:

- a second photo on one day makes `.maybeSingle()` throw `PGRST116`, which
  breaks the Polaroid route **and** the Home widget;
- `on_conflict=day` throws `42P10`, so taking a photo fails outright.

**How to check the gate — and apply it safely:**

```sh
make db-gate     # who is on the new bundle yet
make db-phase3   # applies it, but ONLY if both phones are ready
```

`db-phase3` refuses to run unless BOTH have opened the app at least **twice**
since the release. Twice, not once: the service worker never calls
`skipWaiting`, so the first open only _installs_ the new bundle — it starts
running on the launch after that. One open looks like an upgrade and isn't.

Until then the app is fully functional — it just holds one photo per day, and
the second person to shoot gets a clean "already taken today" instead of
silently overwriting their partner. That failure mode is strictly better than
the one it replaces.

---

## Already applied

- `20260814000001_wishlist_hidden_by_default.sql` — applied 2026-08-12.
  `wishlist_items` was empty, so nothing changed meaning.
- `20260814000002_language_ru_es_only.sql` — applied 2026-08-12. Removed the two
  seeded travel decks (Türkiye and Georgia, 28 cards from 2026-06-30, none of
  them hand-written) and tightened both language CHECKs to `('ru','es')`.
