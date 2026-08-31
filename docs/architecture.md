# Katitos — Architecture

A private long-distance-relationship PWA for two. React + TypeScript + Vite,
Supabase backend, runs locally in Docker, cloud-ready for Vercel + Supabase.

## Stack

- **Vite + React 19 + TypeScript** — static SPA, no SSR.
- **vite-plugin-pwa** — installable PWA, offline shell, web-push service worker.
- **Supabase** — Postgres + RLS, Auth, Storage, Realtime, Edge Functions.
- **TanStack Query** (server state) · **Zustand** (small local state).
- **react-router v7** — routes generated from the feature registry.
- **Tailwind + CSS-variable tokens** (see `src/index.css`) — visual redesign = edit the token block only.
- **ESLint flat + eslint-plugin-boundaries** — enforces feature isolation. **Vitest + Playwright** — tests.

## Layout

```
src/
  app/      composition root (shell, router, registries) — knows nothing about specific features
  kernel/   the shared "OS": supabase, query, auth, couple, realtime, storage, push,
            ui, hooks, lib, registry, engines/deck
  features/ one self-contained vertical slice per feature
```

**Isolation (lint-enforced):** a feature imports only from `@kernel/*` and its
own `./` files — never another feature, never `@app/*`. Only `app/` imports
feature barrels. `kernel` imports nothing from `features`/`app`.
Dependency DAG: `features → kernel`, `app → features + kernel`, `kernel → ∅`.

## Extensibility — adding things is cheap

### Add a feature

1. `src/features/<name>/` with `feature.ts` calling `defineFeature({ id, title, basePath, routes, nav })` and an `index.ts` barrel.
2. One line in `src/app/features.registry.ts`. Routes + nav are derived automatically.

A feature folder mirrors `src/features/wishlists/` (the reference):
`types.ts · api/*.queries.ts · api/*.mutations.ts · components/ · routes/ · feature.ts · index.ts`.

Keep the barrel thin. `features.registry.ts` imports every barrel at boot, so
anything re-exported there lands in the boot chunk — see the note in
`src/features/album/index.ts` for what that cost once.

### Add a home widget

Export a self-fetching component from the feature and render it directly in
`src/app/routes/home.route.tsx`. There is no widget registry — one existed, was
never adopted, and was removed. Home is a written layout, not a grid of tiles.

### Add an idea to the "Soon" shelf

A row in the More drawer does not need a feature behind it. Add an entry to
`src/app/soon.ts` (`{ label, icon, to, order, category }`) and it renders greyed
beside the shipped-but-locked ones. When the idea gets built for real, delete
its line there and let the feature registry take over.

### Add a quiz/deck kind

The deck engine (`@kernel/engines/deck` → `useDeck(deckId)`) is DB-backed (`decks`/`deck_cards`/`deck_responses`) and powers quizzes, this-or-that, would-you-rather, QOTD. Modes: `quiz` (scored), `compare` (reveal when both answer), `swipe`.

## Data layer

- Components call feature hooks only; no raw `supabase` in components.
- Each feature `api/` has `*.queries.ts` (useQuery) + `*.mutations.ts` (useMutation + invalidate).
- Query keys come from `qk` (`src/kernel/query/keys.ts`).
- **RLS:** every table gates on `public.is_member()` (you are one of the two `couple_members`). Outsiders see nothing. Ownership columns default to `auth.uid()`.
- **Storage:** private buckets (`polaroids`, `flowers`, `quiz-media`, `language-audio`, `scavenger-proof`, `georgia-album`, `dates-album`, `avatars`); bucket names + path builders in `src/kernel/storage/buckets.ts`.
- **Realtime:** `useTableSync(table, queryKey)` live-refreshes a query; used for the chalkboard wall, presence, deck reveal, and most list features.

## Auth

Full Supabase email/password auth (`src/kernel/auth`). Locally (`VITE_AUTH_MODE=local`) the app auto-signs-in as a seeded account and the top bar shows a dev user-switcher so both sides of RLS/presence are testable. In prod (`VITE_AUTH_MODE=prod`) the login screen is shown.

## Push

`usePushSubscribe` registers a Web Push subscription (VAPID) into `push_subscriptions`. The `push-notify` Edge Function fans out to the partner. The service worker (`src/sw.ts`) shows the notification. Presence + last-seen + in-app toasts work everywhere; lock-screen push needs an installed PWA over HTTPS (cloud stage).
