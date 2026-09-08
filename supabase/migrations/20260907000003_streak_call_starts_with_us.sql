-- ════════════════════════════════════════════════════════════════════════
-- Katitos - the call starts on OUR first day, not on the server's
--
--   The seed in 20260907000001 gave the shared habit `current_date`, and
--   `current_date` on the database is UTC. Applied from Curicó on the evening
--   of the 7th that lands on the 8th, and a habit that has not started yet
--   cannot be ticked: the first thing either of us would have done in this
--   feature is tap the call and be told it does not exist yet.
--
--   So it starts on the earlier of our two civil dates - the same
--   min-across-the-members rule the rest of the app uses for a shared day.
--   Written to be safe to re-run and safe to skip: it only ever moves the
--   start date BACKWARDS, so it can never invalidate a tick already made.
-- ════════════════════════════════════════════════════════════════════════

update public.habits h
   set effective_from = least(
         h.effective_from,
         (select min(date(now() at time zone public.safe_tz(m.timezone)))
            from public.couple_members m)
       )
 where h.kind = 'shared'
   and h.archived_at is null
   and (select min(date(now() at time zone public.safe_tz(m.timezone)))
          from public.couple_members m) is not null;
