-- ════════════════════════════════════════════════════════════════════════
-- Katitos - the ledger that stops a reminder becoming a nag
--
--   Two nudges, each fired at most once, ever, for a given person and day:
--
--     'day_end'   - three hours before midnight where YOU are, and your photo
--                   for today isn't in yet.
--     'last_call' - one hour before the day you BORROWED from the other clock
--                   closes for good. She wakes on the 12th while Curicó is
--                   still on the 11th; her 11th is fillable until his midnight
--                   and then it is gone. This is the tap on the shoulder.
--
--   The scheduler runs every ten minutes and is deliberately stateless: it asks
--   "is this due, and have I already said it?" and this table is the second
--   half of that question. The primary key IS the rule - a duplicate insert
--   raises 23505 and the sender treats that as "already said", so two ticks
--   racing each other can never both send.
--
--   No RLS policies on purpose. Nothing in the app reads or writes this; only
--   the scheduler's service role touches it, and that bypasses RLS. A table
--   with RLS on and no policy is invisible to every signed-in client, which is
--   exactly right for bookkeeping neither of us should ever see.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.polaroid_reminders (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null,
  kind    text not null check (kind in ('day_end', 'last_call')),
  sent_at timestamptz not null default now(),
  primary key (user_id, day, kind)
);

alter table public.polaroid_reminders enable row level security;

-- Old rows are of no interest to anyone the day after; the sender prunes them.
create index if not exists polaroid_reminders_sent_at_idx
  on public.polaroid_reminders (sent_at);
