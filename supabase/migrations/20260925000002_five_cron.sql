-- ════════════════════════════════════════════════════════════════════════
-- Katitos - the clock behind the Five
--
--   The reminders have to fire at times nobody's phone knows in advance: five
--   random moments inside five windows, in her zone, chosen once a day. And the
--   day has to be closed at 3AM her time whether or not a single app is open -
--   that close is the one that moves the money.
--
--   So the database keeps the time. Every ten minutes it pokes the `five`
--   function, which plans, nudges, warns and settles, per person, in that
--   person's own zone. Ten minutes is the granularity of every promise it makes.
--
--   Same Vault secrets as the polaroid scheduler (see 20260830000012), so a
--   project that already has them needs nothing new, and one that does not gets
--   silence instead of an error every ten minutes:
--
--     select vault.create_secret(
--       'https://<ref>.supabase.co/functions/v1', 'functions_base_url');
--     select vault.create_secret('<service-role-key>', 'service_role_key');
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.tick_five()
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

  if base is null or key is null then
    return; -- not configured; a raise every ten minutes would bury the log
  end if;

  perform net.http_post(
    url     := base || '/five',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || key
               ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
end;
$fn$;

revoke execute on function public.tick_five() from public;

do $reschedule$
begin
  perform cron.unschedule('five-tick');
exception
  when others then null; -- no such job yet
end;
$reschedule$;

select cron.schedule(
  'five-tick',
  '*/10 * * * *',
  $job$select public.tick_five();$job$
);
