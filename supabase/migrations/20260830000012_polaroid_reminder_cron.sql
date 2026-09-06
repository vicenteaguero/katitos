-- ════════════════════════════════════════════════════════════════════════
-- Katitos - the clock that remembers for us
--
--   Every notification in this app until now was fired by a phone that was
--   already awake: you post a photo, your love's phone buzzes. That model
--   cannot say "you have three hours left", because the only device that knows
--   is the one that isn't open.
--
--   So the database keeps the time. Every ten minutes it pokes the
--   `polaroid-reminder` function, which works out - per person, in that
--   person's own zone - whether a nudge is due, and pushes it. Ten minutes is
--   the granularity of the promise: "three hours left" can mean 2h50m.
--
--   ── SECRETS ─────────────────────────────────────────────────────────────
--   The job needs the project's function URL and its service-role key, and
--   NEITHER belongs in a file that lives in git. They come from Vault, and this
--   migration is written to be applied BEFORE they exist: with no secrets the
--   tick returns immediately and nothing errors. Set them once, by hand:
--
--     select vault.create_secret(
--       'https://<ref>.supabase.co/functions/v1', 'functions_base_url');
--     select vault.create_secret('<service-role-key>', 'service_role_key');
--
--   Rotating the key later is an update to that secret; this file never
--   changes. `select * from cron.job_run_details order by start_time desc`
--   shows whether the ticks are landing.
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.tick_polaroid_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  base text;
  key  text;
begin
  select decrypted_secret into base
    from vault.decrypted_secrets where name = 'functions_base_url';
  select decrypted_secret into key
    from vault.decrypted_secrets where name = 'service_role_key';

  -- Not configured yet. Silence is the correct behaviour: a cron job that
  -- raises every ten minutes would bury the log it is supposed to be read in.
  if base is null or key is null then
    return;
  end if;

  perform net.http_post(
    url     := base || '/polaroid-reminder',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || key
               ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
end;
$fn$;

-- Nobody but the scheduler calls this; it holds the service key in a local.
revoke execute on function public.tick_polaroid_reminders() from public;

-- Re-running this migration must not leave two jobs pinging the same function.
do $reschedule$
begin
  perform cron.unschedule('polaroid-reminders');
exception
  when others then null; -- no such job yet
end;
$reschedule$;

select cron.schedule(
  'polaroid-reminders',
  '*/10 * * * *',
  $job$select public.tick_polaroid_reminders();$job$
);
