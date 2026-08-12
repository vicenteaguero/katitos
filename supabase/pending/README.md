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
