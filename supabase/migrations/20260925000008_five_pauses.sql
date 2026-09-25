-- ════════════════════════════════════════════════════════════════════════
-- Katitos - coming back is never a bill
--
--   The pause switch is the one control in the Five that has to be frictionless,
--   because it is the only thing standing between "she asked me to help" and
--   "she cannot make it stop". It was not.
--
--   The scheduler skipped a paused person entirely, which is right, and settled
--   any unsettled day within its lookback, which is also right, and together
--   they were wrong: pause for four days, come back, and the first tick after
--   she returns finds four unsettled days past their 3AM and charges every one of
--   them as five misses. Sixty dollars for the days the app promised were free.
--
--   So a pause is now a fact with dates on it. The scheduler skips any day inside
--   one, forever, and `five_reconcile_day` asks whether the day WAS paused
--   instead of whether she is paused today - which also fixes the quieter twin of
--   the same bug, where a correction made during a pause silently deleted the
--   ledger of an honest day from last week.
--
--   Written by the app when the switch is thrown, and by the scheduler when it
--   auto-pauses her after a silent stretch.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.five_pauses (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users (id) on delete cascade,
  from_day date not null,
  -- Null means "still paused". Closed on the day she starts again, inclusive of
  -- neither end being charged.
  to_day   date,
  -- 'her' when she threw the switch, 'quiet' when the scheduler did it for her
  -- after days of silence. Two different conversations.
  reason   text not null default 'her' check (reason in ('her', 'quiet')),
  created_at timestamptz not null default now()
);

create index if not exists five_pauses_user_idx
  on public.five_pauses (user_id, from_day desc);
-- One open pause per person: a second would make "when did this start" ambiguous.
create unique index if not exists five_pauses_open_uniq
  on public.five_pauses (user_id) where to_day is null;

alter table public.five_pauses enable row level security;
create policy members_all on public.five_pauses
  for all using (public.is_member()) with check (public.is_member());

/** Was the Five switched off, for this person, on this day? */
create or replace function public.five_day_paused(p_user uuid, p_day date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.five_pauses p
     where p.user_id = p_user
       and p.from_day <= p_day
       and (p.to_day is null or p.to_day >= p_day)
  );
$$;

revoke execute on function public.five_day_paused(uuid, date) from public;
grant execute on function public.five_day_paused(uuid, date) to authenticated;

-- ── The switch keeps the record ────────────────────────────────────────────
-- In a trigger, so it is true however the row is written: by her screen, by the
-- scheduler, or by hand at three in the morning.
create or replace function public.five_settings_pause_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  zone  text;
  today date;
begin
  if tg_op = 'UPDATE' and old.active is not distinct from new.active then
    return new;
  end if;

  select public.safe_tz(m.timezone) into zone
    from public.couple_members m where m.user_id = new.user_id;
  today := (now() at time zone coalesce(zone, 'UTC'))::date;

  if not new.active then
    insert into public.five_pauses (user_id, from_day)
    values (new.user_id, today)
    on conflict do nothing; -- already paused; keep the earlier start
  else
    update public.five_pauses
       set to_day = today
     where user_id = new.user_id and to_day is null;
  end if;

  return new;
end;
$fn$;

drop trigger if exists five_settings_pause_log on public.five_settings;
create trigger five_settings_pause_log
  after insert or update on public.five_settings
  for each row execute function public.five_settings_pause_log();

-- ── Putting a day right knows what that day was ────────────────────────────
create or replace function public.five_reconcile_day(p_user uuid, p_day date)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  gift    integer;
  bet     integer;
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
    return 0; -- never settled; the scheduler will write it from the same truth
  end if;

  -- A day she was paused through has no money on it and never will.
  if public.five_day_paused(p_user, p_day) then
    delete from public.five_ledger
     where user_id = p_user and day = p_day and goal_id is not null;
    return 0;
  end if;

  -- The price of THIS day, as it was charged - never today's dials.
  select max(amount_cents) filter (where direction = 'gift'),
         max(amount_cents) filter (where direction = 'bet')
    into gift, bet
    from public.five_ledger
   where user_id = p_user and day = p_day and goal_id is not null;

  if gift is null or bet is null then
    select coalesce(s.gift_cents, 100), coalesce(s.bet_cents, 300)
      into gift, bet
      from public.five_settings s where s.user_id = p_user;
  end if;
  gift := coalesce(gift, 100);
  bet  := coalesce(bet, 300);

  select coalesce(d.hard_day, false) into hard
    from public.five_days d where d.user_id = p_user and d.day = p_day;
  hard := coalesce(hard, false);

  delete from public.five_ledger
   where user_id = p_user and day = p_day and goal_id is not null;

  foreach g in array array['sleep', 'work', 'study', 'eat', 'move'] loop
    select exists (
      select 1 from public.five_marks m
       where m.user_id = p_user and m.day = p_day and m.goal_id = g
         and m.revoked_at is null
    ) into live;

    -- A hard day forgives the misses and keeps what she held. It used to zero
    -- both, which put a price on the one button meant for her worst days.
    if not live and hard then
      continue;
    end if;

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

-- ── A hard day can carry a sentence ────────────────────────────────────────
-- `five_days.note` has existed since the first migration and nothing ever wrote
-- to it. A hard day with a line in it is a message to him, which is the thing
-- she actually asked for: somebody to talk to about it.
comment on column public.five_days.note is
  'What she said about the day, usually on a hard one. Shown to him.';
