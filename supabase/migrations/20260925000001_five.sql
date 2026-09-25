-- ════════════════════════════════════════════════════════════════════════
-- Katitos - the Five
--
--   She asked for help holding five things a day: sleep seven or eight hours,
--   study, work, eat properly, walk or train. She does not want them tracked
--   with her therapist, she asked her Katito, and a habit tracker is the wrong
--   tool for her: streaks and red days turn one bad week into a pile of
--   evidence against her.
--
--   So nothing here scores her. What moves is HIS money, and only his. A goal
--   done puts a dollar in a pot that becomes a gift for her. A goal missed puts
--   three in a pot he actually bets on sport, and `five_bets` keeps every one of
--   those bets forever, won or lost, so the burn is never an abstraction. She is
--   never punished; she watches a present for her walk into a bookmaker.
--
--   ── THE ONE ASYMMETRY ───────────────────────────────────────────────────
--   The screen is identical for both of them. She can only mark inside her own
--   day, plus a grace window until 3AM the next morning, because a tracker you
--   can back-fill is a diary. He can mark, unmark and reopen anything, any day,
--   forever - he is the one who finds out over a call that a tap was generous.
--   That rule lives in a TRIGGER, not only in the UI: it is the whole integrity
--   of the thing, and a screen is a suggestion.
--
--   Her way out is `five_settings.active`. A tracker she cannot switch off is
--   not help, it is coercion, and coercion is the one thing that makes
--   depression worse. Paused means nothing moves in either pot.
-- ════════════════════════════════════════════════════════════════════════

-- ── The dials ──────────────────────────────────────────────────────────────
-- One row per person, created on first write, never seeded: seed.sql does not
-- run on prod, so a seeded row would exist here and be missing where it counts.
-- Both of them can read and write the row, which is deliberate - she must be
-- able to pause without asking, and he must be able to retune the stakes.
create table if not exists public.five_settings (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  gift_cents  integer not null default 100 check (gift_cents >= 0),
  bet_cents   integer not null default 300 check (bet_cents >= 0),
  active      boolean not null default true,
  updated_at  timestamptz not null default now()
);
create trigger five_settings_updated_at before update on public.five_settings
  for each row execute function public.set_updated_at();

-- ── The day ────────────────────────────────────────────────────────────────
-- A row exists only once something was said about that day. `hard_day` is her
-- valve: the day still happened, it is still in the strip, and not a cent moves.
create table if not exists public.five_days (
  user_id     uuid not null references auth.users (id) on delete cascade,
  day         date not null,
  hard_day    boolean not null default false,
  hard_day_at timestamptz,
  note        text,
  primary key (user_id, day)
);

-- ── The taps ───────────────────────────────────────────────────────────────
-- `goal_id` is a plain text key ('sleep', 'study', 'work', 'eat', 'move') and
-- the five live in code, not in a table here: a seeded goal list would look
-- deleted on prod, and these five are not going to be edited from a screen.
--
-- A revoke never deletes. `revoked_at` is set instead, so the history keeps
-- both facts: that she said yes, and that he took it back.
create table if not exists public.five_marks (
  user_id     uuid not null references auth.users (id) on delete cascade,
  day         date not null,
  goal_id     text not null,
  done_at     timestamptz not null default now(),
  marked_by   uuid references auth.users (id) on delete set null,
  revoked_at  timestamptz,
  revoked_by  uuid references auth.users (id) on delete set null,
  primary key (user_id, day, goal_id)
);
create index if not exists five_marks_day_idx on public.five_marks (day desc);

-- ── The bets ───────────────────────────────────────────────────────────────
-- His log, and the part she is meant to remember. Nothing is ever deleted from
-- it; a mistake is a 'void' row. A won bet pays into HER pot (see the ledger),
-- so even a burned day keeps a small chance of coming back as a present.
create table if not exists public.five_bets (
  id          uuid primary key default gen_random_uuid(),
  day         date not null,
  sport       text,
  pick        text not null,
  stake_cents integer not null check (stake_cents > 0),
  odds        numeric check (odds > 0),
  status      text not null default 'open'
                check (status in ('open', 'won', 'lost', 'void')),
  payout_cents integer check (payout_cents >= 0),
  note        text,
  placed_at   timestamptz not null default now(),
  settled_at  timestamptz
);
create index if not exists five_bets_day_idx on public.five_bets (day desc);

-- ── The money ──────────────────────────────────────────────────────────────
-- Written once per goal per day, by the scheduler, when the grace window shuts
-- at 3AM her time. The unique index IS the idempotency rule: two overlapping
-- ticks both reach the insert and exactly one of them gets through.
create table if not exists public.five_ledger (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  day          date not null,
  goal_id      text,
  direction    text not null check (direction in ('gift', 'bet')),
  amount_cents integer not null check (amount_cents >= 0),
  reason       text not null
                 check (reason in ('done', 'missed', 'revoked', 'bet_win')),
  bet_id       uuid references public.five_bets (id) on delete cascade,
  created_at   timestamptz not null default now()
);
create unique index if not exists five_ledger_goal_uniq
  on public.five_ledger (user_id, day, goal_id, direction)
  where goal_id is not null;
-- A bet can pay her exactly once, however many times it is settled.
create unique index if not exists five_ledger_bet_uniq
  on public.five_ledger (bet_id) where bet_id is not null;
create index if not exists five_ledger_day_idx on public.five_ledger (day desc);

-- ── The reminder ledger ────────────────────────────────────────────────────
-- The randomised times for today AND the stop that keeps a reminder from
-- becoming a nag, in one table: `slot_at` is planned once on the first tick of
-- her day, `sent_at` is stamped before the push goes out. No RLS policies on
-- purpose - only the scheduler's service role touches it, exactly like
-- `polaroid_reminders`.
create table if not exists public.five_reminders (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null,
  goal_id text not null,
  slot_at timestamptz not null,
  sent_at timestamptz,
  primary key (user_id, day, goal_id)
);
create index if not exists five_reminders_slot_idx
  on public.five_reminders (slot_at) where sent_at is null;

-- ── Who may write what ─────────────────────────────────────────────────────
alter table public.five_settings  enable row level security;
alter table public.five_days      enable row level security;
alter table public.five_marks     enable row level security;
alter table public.five_bets      enable row level security;
alter table public.five_ledger    enable row level security;
alter table public.five_reminders enable row level security;

-- Both of them see all of it. There is nothing here she should be kept from -
-- the bets are the point, and the pots are hers.
create policy members_all on public.five_settings
  for all using (public.is_member()) with check (public.is_member());
create policy members_all on public.five_days
  for all using (public.is_member()) with check (public.is_member());
create policy members_all on public.five_marks
  for all using (public.is_member()) with check (public.is_member());
create policy members_read on public.five_ledger
  for select using (public.is_member());
-- Only he writes the bets, and nobody writes the ledger from a screen: it is
-- settled by the scheduler and corrected by one RPC below.
create policy admin_writes on public.five_bets
  for all using (public.is_member()) with check (public.is_admin());

-- ── The grace window, enforced ─────────────────────────────────────────────
-- Past 3AM the morning after, her day is closed. Him: never. The service role
-- (auth.uid() is null) is not bound either - it is the thing that closes days.
create or replace function public.five_guard_window()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  zone   text;
  cutoff timestamptz;
  today  date;
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  select public.safe_tz(timezone) into zone
    from public.couple_members where user_id = auth.uid();
  zone := coalesce(zone, 'UTC');

  today  := (now() at time zone zone)::date;
  -- 3AM of the morning after `day`, on her wall clock, as a real instant.
  cutoff := ((new.day + 1)::timestamp + interval '3 hours') at time zone zone;

  if new.day > today then
    raise exception 'that day has not happened yet' using errcode = 'P0001';
  end if;
  if now() > cutoff then
    raise exception 'that day is closed' using errcode = 'P0002';
  end if;
  return new;
end;
$fn$;

create trigger five_marks_window
  before insert or update or delete on public.five_marks
  for each row execute function public.five_guard_window();
create trigger five_days_window
  before insert or update on public.five_days
  for each row execute function public.five_guard_window();

-- ── One hard day a week ────────────────────────────────────────────────────
-- The valve is a valve, not a tap. Seven days between them, counted from the
-- last one she used, and he is not bound by it - if she calls him in pieces on
-- day three he can give her the day himself.
create or replace function public.five_guard_hard_day()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not new.hard_day then
    return new;
  end if;
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if exists (
    select 1 from public.five_days d
     where d.user_id = new.user_id
       and d.hard_day
       and d.day <> new.day
       and d.day > new.day - 7
  ) then
    raise exception 'one hard day a week' using errcode = 'P0003';
  end if;
  return new;
end;
$fn$;

create trigger five_days_hard_day
  before insert or update on public.five_days
  for each row execute function public.five_guard_hard_day();

-- ── Putting a settled day right ────────────────────────────────────────────
-- He unmarks a tap three days later, and the pots have to follow. The ledger is
-- rewritten from the marks as they now stand - only the goal rows, never the
-- `bet_win` rows, and only for a day that has already been settled. An open day
-- has nothing to correct: the scheduler will write it from the same truth.
create or replace function public.five_reconcile_day(p_user uuid, p_day date)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  gift    integer;
  bet     integer;
  paused  boolean;
  hard    boolean;
  written integer := 0;
  g       text;
  live    boolean;
begin
  if not public.is_member() then
    raise exception 'not a member' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.five_ledger
     where user_id = p_user and day = p_day and goal_id is not null
  ) then
    return 0; -- never settled; nothing to put right
  end if;

  select coalesce(s.gift_cents, 100), coalesce(s.bet_cents, 300),
         not coalesce(s.active, true)
    into gift, bet, paused
    from public.five_settings s where s.user_id = p_user;
  gift   := coalesce(gift, 100);
  bet    := coalesce(bet, 300);
  paused := coalesce(paused, false);

  select coalesce(d.hard_day, false) into hard
    from public.five_days d where d.user_id = p_user and d.day = p_day;
  hard := coalesce(hard, false);

  delete from public.five_ledger
   where user_id = p_user and day = p_day and goal_id is not null;

  if hard or paused then
    return 0; -- a hard day costs nothing and earns nothing, then or now
  end if;

  foreach g in array array['sleep', 'study', 'work', 'eat', 'move'] loop
    select exists (
      select 1 from public.five_marks m
       where m.user_id = p_user and m.day = p_day and m.goal_id = g
         and m.revoked_at is null
    ) into live;

    insert into public.five_ledger
      (user_id, day, goal_id, direction, amount_cents, reason)
    values (
      p_user, p_day, g,
      case when live then 'gift' else 'bet' end,
      case when live then gift else bet end,
      case when live then 'done' else 'revoked' end
    );
    written := written + 1;
  end loop;

  return written;
end;
$fn$;

revoke execute on function public.five_reconcile_day(uuid, date) from public;
grant execute on function public.five_reconcile_day(uuid, date) to authenticated;

-- ── Live ───────────────────────────────────────────────────────────────────
-- His phone shows her tap as it lands, eleven time zones away. `replica
-- identity full` so a delete arrives with enough of the row to know what went.
do $realtime$
declare t text;
begin
  foreach t in array array['five_marks', 'five_days', 'five_ledger', 'five_bets'] loop
    execute format('alter table public.%I replica identity full;', t);
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$realtime$;
