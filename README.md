# Katitos 💛

A tiny private app for two — our long-distance place. Daily polaroids,
countdowns, quizzes, a chalkboard wall, games, the Georgia 2026 trip, language
practice, and a pile of little widgets. Built to keep growing: every feature is
a self-contained folder wired through one registry line.

> Private, for two people. Not for sale. Visual design is intentionally minimal
> for now — the focus is a clean, extensible foundation.

## Stack

Vite · React 19 · TypeScript · Tailwind · PWA · **Supabase** (Postgres + RLS,
Auth, Storage, Realtime, Edge Functions). Runs fully **local in Docker**;
cloud-ready for **Vercel + Supabase** with no code changes.

## Quick start (local)

Prereqs: **Node 22+, Docker, Supabase CLI**.

```bash
cp .env.example .env.local        # local defaults already filled in
supabase start                    # boots Postgres/Auth/Storage/Realtime (Docker)
npm install
npm run dev                       # http://127.0.0.1:5173
# …or run the dev server in Docker instead of `npm run dev`:
docker compose up web
```

Local auth is **bypassed**: the app auto-signs-in as a seeded account, and the
top bar has a switcher to flip between the two of you (`Vicente` / `Anastasia`,
password `katitos123`).

## Scripts

| Script                     | What                                                             |
| -------------------------- | ---------------------------------------------------------------- |
| `npm run dev`              | Vite dev server                                                  |
| `npm run build`            | Production build → `dist/`                                       |
| `npm run typecheck`        | `tsc` (app + node + worker)                                      |
| `npm run lint`             | ESLint (incl. feature-isolation boundaries)                      |
| `npm run test`             | Vitest unit/component suite                                      |
| `npm run test:integration` | Integration tests vs local Supabase (run `supabase start` first) |
| `npm run test:e2e`         | Playwright smoke over every route                                |
| `npm run db:types`         | Regenerate `database.types.ts` from the local DB                 |
| `npm run db:reset`         | Reset local DB (re-run migrations + seed)                        |

Run by hand, not wired to a script — each documents its own invocation at the
top of the file:

| Tool                    | What                                                   |
| ----------------------- | ------------------------------------------------------ |
| `scripts/seed-demo.mjs` | Fill a local stack with demo rows                      |
| `scripts/gen-icons.mjs` | Regenerate the PWA icon set in `public/icons/`         |
| `scripts/gen-vapid.mjs` | Mint a VAPID keypair for web push (see `.env.example`) |

## Docs

- [docs/architecture.md](docs/architecture.md) — structure, the registries, how to add a feature/widget/game.
- [docs/deployment.md](docs/deployment.md) — the (later) Vercel + Supabase cloud steps.
- [docs/research/possible-features.md](docs/research/possible-features.md) — backlog of ideas.
