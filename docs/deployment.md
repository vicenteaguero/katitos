# Katitos — Deployment

The app is **live**. Supabase cloud and Vercel are both configured, and the repo
is linked to each. This is how a change reaches the two phones, and what to do
when something needs more than a `git push`.

## The everyday path

Push to `main`. Vercel builds `npm run build` → static `dist/` and deploys it.
`vercel.json` carries the SPA rewrite and the cache headers for `version.json`
and `sw.js`.

Nothing else is needed for a code-only change.

## When the schema changes

Migrations are the source of truth. `make db-push` applies everything in
`supabase/migrations/` to the cloud over the IPv4 session pooler — the direct
`db.<ref>.supabase.co` host is IPv6-only and fails behind a VPN TUN.

```
make db-push     # apply migrations to cloud
make db-diff     # drift check — want: empty
make db-types    # regenerate database.types.ts from the CLOUD schema
```

Credentials live in `.env.supabase.local` (gitignored). `make help` lists every
target.

**A migration the previous JS bundle cannot survive goes in `supabase/pending/`
first**, not in `migrations/` — see that folder's README for the gate. The
service worker does not `skipWaiting`, so a deploy installs a new bundle and
the _next_ launch runs it; `AutoUpdate` takes the new build at launch, but a
phone that has not opened the app since the deploy is still on the old one.
`make db-gate` answers "is everyone running the new code yet?".

## When an Edge Function changes

```
make functions-deploy    # push-notify + currency-rates, --use-api (no Docker)
make deploy              # db-push + functions-deploy together
```

Function secrets are set with `supabase secrets set` and are **not** the same
store as Vercel's env vars. Web push needs the VAPID keypair in both places:
the private half in Supabase, `VITE_VAPID_PUBLIC_KEY` in Vercel. A mismatch
means subscriptions save and every send silently fails. Mint a pair with
`node scripts/gen-vapid.mjs`.

## Vercel from the CLI

```
make vercel-status    # recent deployments
make vercel-env       # production env vars
make vercel-prod      # deploy to production (git push to main also does this)
```

## iOS push, per device

Web Push on iOS needs the PWA **installed** to the Home Screen (iOS 16.4+) over
HTTPS. After installing, open the app → Settings → "Enable notifications" to
register the subscription.

## Notes

- No secrets are committed. `.env.example` is the template; `.env.local` and
  `supabase/functions/.env` are gitignored.
- `supabase db diff` should be empty — migrations capture the full schema.
- `seed.sql` runs only on a local `db:reset`. Production has never been seeded,
  so anything that depends on seeded rows has to self-heal in the app.
- Docker (`docker compose up web`, `Dockerfile.web`) is a local dev convenience
  only. Production never uses it — Vercel builds the static SPA itself.
