-- ════════════════════════════════════════════════════════════════════════
-- Katitos - the ten-minute tick that saves the streak
--
--   The streak's real enemy is not a missed habit, it is a habit you did and
--   forgot to tick - and the only device that knows the day is running out is
--   the one nobody has opened. So the database keeps the time here too, exactly
--   as it does for the Polaroid, and pokes `streak-reminder` every ten minutes.
--
--   Secrets come from Vault and are shared with the Polaroid job; if they are
--   not set yet the tick returns immediately and nothing errors. See
--   20260830000012 for how to create them - this file needs nothing new.
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.tick_streak_reminders()
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

  -- Not configured yet. Silence is correct: a job that raises every ten
  -- minutes buries the log it is supposed to be read in.
  if base is null or key is null then
    return;
  end if;

  perform net.http_post(
    url     := base || '/streak-reminder',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || key
               ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
end;
$fn$;

revoke execute on function public.tick_streak_reminders() from public;

-- Re-running this migration must not leave two jobs pinging the same function.
do $reschedule$
begin
  perform cron.unschedule('streak-reminders');
exception
  when others then null; -- no such job yet
end;
$reschedule$;

-- Five minutes off the Polaroid job, so the two never fight for the same tick.
select cron.schedule(
  'streak-reminders',
  '5-59/10 * * * *',
  $job$select public.tick_streak_reminders();$job$
);
