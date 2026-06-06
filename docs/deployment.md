# Katitos — Deployment (later)

The app is **cloud-ready but not cloud-configured**. Everything runs locally
today. When you're ready to go live, follow these steps. Nothing here has been
executed.

## Going live = swap env + push migrations/functions. Zero code change.

### 1. Supabase cloud project

1. Create a project at supabase.com.
2. Link the local repo: `supabase link --project-ref <ref>`.
3. Push the schema (migrations are the source of truth):
   `supabase db push` ← creates all tables, RLS, buckets.
4. Deploy Edge Functions:
   `supabase functions deploy push-notify`
   `supabase functions deploy currency-rates`
5. Set function secrets (web-push):
   `supabase secrets set VAPID_PUBLIC_KEY=… VAPID_PRIVATE_KEY=… VAPID_SUBJECT=mailto:you@example.com`
   (generate a fresh pair with `node scripts/gen-vapid.mjs`).
6. Auth → keep email/password enabled. Create the two accounts (dashboard → Authentication → Users, or run an adapted `supabase/seed.sql` once). Insert the two `couple_members` rows + the `couple` row.
7. (Optional) Schedule `currency-rates` daily via Supabase cron.

### 2. Vercel

1. Import the repo (framework preset **Vite** is auto-detected; `vercel.json` sets the SPA rewrite).
2. Set environment variables (Project → Settings → Environment Variables):
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = project anon/publishable key
   - `VITE_AUTH_MODE` = `prod` ← shows the real login screen
   - `VITE_VAPID_PUBLIC_KEY` = the public half of the VAPID pair
3. Deploy. The build is `npm run build` → static `dist/`.

### 3. iOS push (per device)

Web Push on iOS requires the PWA to be **installed** to the Home Screen
(iOS 16.4+) and served over HTTPS (Vercel is). After install, open the app →
Settings → "Enable notifications" to register the subscription. Then "partner
opened the app" and chalkboard pings deliver to the lock screen.

## Notes

- No secrets are committed. `.env.example` is the template; `.env.local` and `supabase/functions/.env` are gitignored.
- `supabase db diff` should be empty (migrations capture the full schema).
- The same `docker compose up web` + local Supabase flow is the dev environment; production never uses `Dockerfile.web`.
