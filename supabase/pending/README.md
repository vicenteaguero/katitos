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

**How to check the gate:**

```sql
select display_name, last_seen_at from public.couple_members order by role;
```

Both `last_seen_at` values must be later than the deploy of the release that
contains the new polaroid client. (`select max(opened_at) from public.app_opens
group by user_id` works too.) When both have opened the app since that deploy,
they are on the new bundle and this is safe.

Until then the app is fully functional — it just holds one photo per day, and
the second person to shoot gets a clean "already taken today" instead of
silently overwriting their partner. That failure mode is strictly better than
the one it replaces.

---

## `20260814000001_wishlist_hidden_by_default.sql`

**Gate: same one — both phones on the new bundle.**

`wishlist_items.visible` shipped defaulting to TRUE so that adding the column
didn't retroactively hide every existing item from the other person. The new
add-sheet always sends `visible` explicitly (closed by default), so once both
are upgraded the database default can match the UI.

Harmless to run late. Only affects rows inserted without the column.

---

## `20260814000002_language_ru_es_only.sql`

**Gate: decide what happens to the trip decks first — this DELETES them.**

The Turkish and Georgian decks were created by migration `20260630000003`, so
they exist on production. The UI no longer offers those languages, but the rows
are still there and the CHECK constraints still permit them.

Before running:

```sql
select d.title, count(p.id) as cards
  from public.language_decks d
  left join public.phrases p on p.deck_id = d.id
 where d.language in ('tr','ka')
 group by d.title;
```

If any of those cards are worth keeping, move them onto a Russian or Spanish
deck first. There is no rush — leaving this unrun costs nothing.
