-- ════════════════════════════════════════════════════════════════════════
-- Katitos - a Polaroid day closes when it is over, not two hours later
--
--   `polaroid_day_open()` shipped with a ±2h grace on BOTH sides. The forward
--   half was harmless; the backward half was the bug. Between 00:00 and 02:00
--   in Curicó you could still fill the previous date - a date that had already
--   ended in Curicó AND in Novosibirsk. Nobody on earth was living it. The
--   whole promise of the feature is "it has to still be that day SOMEWHERE",
--   and for two hours a night it quietly wasn't.
--
--   The new rule is the promise, literally: `d` is writable while `d` is the
--   civil date on one of our two wall clocks.
--
--   The five minutes that remain are NOT grace, and they are not a day you may
--   choose. They exist for exactly one thing: you press the shutter at
--   23:59:58 and the bytes land at 00:00:03. The photo already exists; refusing
--   it would destroy something real. The app never OFFERS a day inside that
--   window - `openDays()` is strict - so the only writes it can ever accept are
--   the ones already in flight.
--
--   Safe for the old bundle. The previous JS still lists grace days in its
--   catch-up sheet; picking one now raises 'day_closed', which the client
--   already turns into "That day has ended for both of us - it's closed now 🌙"
--   and the orphaned upload is cleaned up. Loud and harmless, and it stops the
--   moment both phones take the new bundle.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.polaroid_day_open(d date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.couple_members m
    where d = date(now() at time zone public.safe_tz(m.timezone))
       -- The in-flight upload. `now() - 5 min` differs from `now()` only in the
       -- first five minutes after a local midnight, so on every other minute of
       -- the day this second test is the same date as the first and adds
       -- nothing at all.
       or d = date((now() - interval '5 minutes') at time zone public.safe_tz(m.timezone))
  );
$$;
