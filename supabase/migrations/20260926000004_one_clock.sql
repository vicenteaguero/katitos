-- ════════════════════════════════════════════════════════════════════════
-- Katitos - one clock for one feature
--
--   Two cron jobs poking two edge functions about the same page is the same
--   mistake as two pages. `streak-reminder` nudged, `five` settled the money,
--   and both of them read the same habits on the same schedule, ten minutes
--   apart, from the same database.
--
--   Now there is `habits-tick`: it nudges, it settles at the close of a day, it
--   notices a silent stretch and switches the money off rather than piling it
--   up, and it reminds him when he owes the bookmaker more than he has placed.
--
--   The old polaroid clock keeps its own job, because that is a different
--   feature with a different day.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.tick_habits()
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
    return; -- not configured; silence beats raising every ten minutes
  end if;

  perform net.http_post(
    url     := base || '/habits-tick',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || key
               ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
end;
$fn$;

revoke execute on function public.tick_habits() from public;

do $reschedule$
begin
  perform cron.unschedule('five-tick');
exception when others then null;
end;
$reschedule$;

do $reschedule$
begin
  perform cron.unschedule('streak-reminders');
exception when others then null;
end;
$reschedule$;

-- Offset from the polaroid clock so the two are never in the pooler at once.
select cron.schedule(
  'habits-tick',
  '5-59/10 * * * *',
  $job$select public.tick_habits();$job$
);

drop function if exists public.tick_five();
drop function if exists public.tick_streak_reminders();
