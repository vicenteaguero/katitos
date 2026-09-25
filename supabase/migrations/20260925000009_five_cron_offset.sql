-- ════════════════════════════════════════════════════════════════════════
-- Katitos - the three clocks take turns
--
--   `polaroid-reminders` runs at :00, :10, :20 …, `streak-reminders` at :05,
--   :15, :25 … and the Five arrived on the polaroid's minute. Three jobs, two of
--   them waking an edge function and one of them settling money, all firing into
--   the same pooler connection at the same instant, every ten minutes, forever.
--
--   Nothing has broken yet. Moving the Five to :02 is two minutes of foresight
--   rather than a fix, and it keeps the reminder granularity exactly as it was.
-- ════════════════════════════════════════════════════════════════════════

do $reschedule$
begin
  perform cron.unschedule('five-tick');
exception
  when others then null;
end;
$reschedule$;

select cron.schedule(
  'five-tick',
  '2-59/10 * * * *',
  $job$select public.tick_five();$job$
);
