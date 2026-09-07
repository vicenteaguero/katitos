-- ════════════════════════════════════════════════════════════════════════
-- Katitos - one streak, kept by the two of us
--
--   Every other feature here is a place you visit. This one is the opposite:
--   a single number the two of us are responsible for, together. Each of us
--   picks our own habits, there is one shared habit on top (did we talk
--   today), and the streak is joint - if either of us misses anything, both
--   of us lose it. That is the whole emotional design, and the schema exists
--   to make it true.
--
--   ── THE DAY ─────────────────────────────────────────────────────────────
--   A day is a calendar label ('2026-09-07'), lived by each of us in our own
--   zone. Her Saturday and his Saturday are the same square. What differs is
--   when the square closes, and that is `habit_day_open()`: you may tick a day
--   until the LATER of our two wall clocks has passed the day after it. In
--   practice she can still fill her Saturday until his Sunday ends in Curicó.
--   Generous on purpose - the thing that kills a streak is not a missed habit,
--   it is a done habit nobody remembered to tick.
--
--   ── THE SLOTS ───────────────────────────────────────────────────────────
--   Habit n needs a streak of {1:0, 2:7, 3:14, 4:21} to be created. Nothing is
--   ever taken away: lose the streak and you keep all four, still required.
--   But a slot you empty stays empty until the streak earns it back - which is
--   the rule that makes "just delete the one you keep failing" cost something.
--
--   ── WHY THE STREAK IS COMPUTED TWICE ────────────────────────────────────
--   `streak_days()` here counts DAILY habits only. The client
--   (src/features/streak/lib/streak.ts) also holds back the days of a week
--   whose weekly quota is still unmet, so the number it shows is always <= the
--   one below. That asymmetry is deliberate: this function is the floor under
--   the slot guard, so the database can never refuse a habit the app just
--   offered you. It is a belt, not the rule.
--
--   All additive - new tables only, so the JS bundle already on a phone is
--   entirely unaffected and this goes in migrations/, not pending/.
-- ════════════════════════════════════════════════════════════════════════

-- ── the habits ─────────────────────────────────────────────────────────────
-- user_id null = the shared one. It belongs to neither of us, which is the
-- point: whoever remembers first ticks it.
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  kind text not null default 'personal' check (kind in ('personal', 'shared')),
  title text not null check (length(btrim(title)) between 1 and 40),
  emoji text not null default '✨',
  -- 'daily' - every day, or the streak breaks.
  -- 'weekly' - target_per_week times between Monday and Sunday. A weekly habit
  -- never breaks a single day; it breaks the week it ends short.
  schedule text not null default 'daily' check (schedule in ('daily', 'weekly')),
  target_per_week smallint not null default 1 check (target_per_week between 1 and 6),
  -- 0 is the shared habit's slot; 1..4 are a person's own, in the order earned.
  slot smallint not null default 1 check (slot between 0 and 4),
  -- A habit added at 23:50 must not cost tonight. The client sets this to
  -- tomorrow, unless it is your first one, in which case it starts today.
  effective_from date not null default current_date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint habits_owner_matches_kind check (
    (kind = 'shared' and user_id is null and slot = 0) or
    (kind = 'personal' and user_id is not null and slot between 1 and 4)
  )
);

-- One living shared habit, and one living habit per slot per person. Archiving
-- frees the slot - earning it back is the streak's job, not the index's.
create unique index if not exists habits_shared_uniq
  on public.habits (kind) where kind = 'shared' and archived_at is null;
create unique index if not exists habits_slot_uniq
  on public.habits (user_id, slot) where kind = 'personal' and archived_at is null;
create index if not exists habits_live_idx
  on public.habits (archived_at, effective_from);

-- ── the ticks ──────────────────────────────────────────────────────────────
-- A row means "done". Unticking deletes it. There is no false, because a day
-- with no row is already the whole story.
create table if not exists public.habit_entries (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  day date not null,
  marked_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  unique (habit_id, day)
);
create index if not exists habit_entries_day_idx on public.habit_entries (day);

drop trigger if exists habits_updated_at on public.habits;
create trigger habits_updated_at before update on public.habits
  for each row execute function public.set_updated_at();

-- ── is this square still open for me? ──────────────────────────────────────
-- Never the future, and never past the end of the day after it on the later of
-- our two clocks. Both of us compute the same closing instant from either side
-- of the world, which is what makes "you can still fix yesterday" honest.
create or replace function public.habit_day_open(d date, u uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select d <= (
           select date(now() at time zone public.safe_tz(m.timezone))
           from public.couple_members m where m.user_id = u
         )
     and d + 1 >= (
           select max(date(now() at time zone public.safe_tz(m.timezone)))
           from public.couple_members m
         );
$$;

revoke execute on function public.habit_day_open(date, uuid) from public;
grant execute on function public.habit_day_open(date, uuid) to authenticated;

-- ── how many days in a row, counting daily habits only ─────────────────────
-- Walks back from the furthest-ahead clock. Days that are still open and still
-- incomplete are skipped rather than counted against us - they are in progress,
-- not failed. The first CLOSED incomplete day is where the run ends.
create or replace function public.streak_days()
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  max_local date;
  d         date;
  n         integer := 0;
  guard     integer := 0;
  complete  boolean;
begin
  select max(date(now() at time zone public.safe_tz(m.timezone)))
    into max_local from public.couple_members m;
  if max_local is null then
    return 0;
  end if;

  d := max_local;
  loop
    guard := guard + 1;
    exit when guard > 3650;

    -- Every daily habit that was in force that day, and all of them ticked.
    -- The `count(*) > 0` is not decoration: without it a day nobody had a
    -- habit on comes out vacuously perfect, and the walk runs to its limit.
    select count(*) > 0 and count(*) filter (
             where exists (
               select 1 from public.habit_entries e
               where e.habit_id = h.id and e.day = d
             )
           ) = count(*)
      into complete
      from public.habits h
     where h.schedule = 'daily'
       and h.effective_from <= d
       and (h.archived_at is null or date(h.archived_at) > d);

    if complete then
      n := n + 1;
    elsif d + 1 >= max_local then
      -- Still open. Not a miss yet, so it neither counts nor breaks.
      null;
    else
      exit;
    end if;

    d := d - 1;
  end loop;

  return n;
end;
$$;

revoke execute on function public.streak_days() from public;
grant execute on function public.streak_days() to authenticated;

-- ── the rules, with something human to say ─────────────────────────────────
-- In a trigger rather than in RLS, for the reason spelled out in
-- 20260811000002: a WITH CHECK rejection is an opaque 42501, and a USING clause
-- that matches nothing reports 204 SUCCESS on an update that never happened.
create or replace function public.habits_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  threshold integer;
  live      integer;
begin
  if tg_op = 'INSERT' then
    if new.kind = 'personal' then
      -- Signed in, the owner is always you. Null means the service role or the
      -- seed, which sets the column itself and is trusted to.
      if auth.uid() is not null then
        new.user_id := auth.uid();
      end if;

      threshold := case new.slot when 1 then 0 when 2 then 7 when 3 then 14 else 21 end;
      if auth.uid() is not null and public.streak_days() < threshold then
        raise exception 'slot % needs a streak of %', new.slot, threshold
          using errcode = 'P0001', hint = 'slot_locked';
      end if;

      -- Slots are earned in order; there is no skipping to the fourth.
      select count(*) into live from public.habits h
        where h.kind = 'personal' and h.user_id = new.user_id
          and h.archived_at is null and h.slot < new.slot;
      if live <> new.slot - 1 then
        raise exception 'fill slot % first', live + 1
          using errcode = 'P0001', hint = 'slot_out_of_order';
      end if;
    end if;
    return new;
  end if;

  -- UPDATE. The shared habit is nobody's to rename away from the other; a
  -- personal one is only its owner's.
  if old.kind = 'personal' and auth.uid() is not null and old.user_id <> auth.uid() then
    raise exception 'that habit is not yours'
      using errcode = 'P0001', hint = 'not_owner';
  end if;

  new.id      := old.id;
  new.kind    := old.kind;
  new.user_id := old.user_id;
  new.slot    := old.slot;
  return new;
end;
$$;

drop trigger if exists habits_guard on public.habits;
create trigger habits_guard before insert or update on public.habits
  for each row execute function public.habits_guard();

create or replace function public.habit_entries_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  h public.habits;
  d date;
begin
  if tg_op = 'DELETE' then
    select * into h from public.habits where id = old.habit_id;
    d := old.day;
  else
    select * into h from public.habits where id = new.habit_id;
    d := new.day;
    if auth.uid() is not null then
      new.marked_by := auth.uid();
    end if;
  end if;

  if h.id is null then
    raise exception 'no such habit' using errcode = 'P0001', hint = 'no_habit';
  end if;

  -- A personal habit is ticked by the person whose habit it is. The shared one
  -- is ticked by whoever remembers - that is what makes it shared.
  if h.kind = 'personal' and auth.uid() is not null and h.user_id <> auth.uid() then
    raise exception 'that one is not yours to tick'
      using errcode = 'P0001', hint = 'not_owner';
  end if;

  if not public.habit_day_open(d, auth.uid()) then
    -- Closed and not-yet-lived are both "no", but they are not the same "no",
    -- and the app has a different sentence for each.
    if auth.uid() is not null and d > (
         select date(now() at time zone public.safe_tz(m.timezone))
         from public.couple_members m where m.user_id = auth.uid()
       ) then
      raise exception 'day % has not started for you', d
        using errcode = 'P0001', hint = 'day_future';
    end if;
    raise exception 'day % is closed', d
      using errcode = 'P0001', hint = 'day_closed';
  end if;

  if tg_op = 'INSERT' then
    if d < h.effective_from then
      raise exception 'habit % had not started on %', h.title, d
        using errcode = 'P0001', hint = 'not_started';
    end if;
    if h.archived_at is not null then
      raise exception 'habit % is put away', h.title
        using errcode = 'P0001', hint = 'archived';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists habit_entries_guard on public.habit_entries;
create trigger habit_entries_guard before insert or update or delete on public.habit_entries
  for each row execute function public.habit_entries_guard();

-- ── the reminder ledger ────────────────────────────────────────────────────
-- Same shape and the same reasoning as polaroid_reminders: the primary key IS
-- the "have I already said this" rule, and RLS on with no policy keeps the
-- bookkeeping invisible to both of us.
create table if not exists public.habit_reminders (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null,
  kind    text not null check (kind in ('day_end', 'last_call')),
  sent_at timestamptz not null default now(),
  primary key (user_id, day, kind)
);

alter table public.habit_reminders enable row level security;

create index if not exists habit_reminders_sent_at_idx
  on public.habit_reminders (sent_at);

-- ── policies + live sync ───────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['habits', 'habit_entries'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists members_all on public.%I;', t);
    execute format(
      'create policy members_all on public.%I for all using (public.is_member()) with check (public.is_member());',
      t);
    execute format('alter table public.%I replica identity full;', t);
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ── the one habit that was always going to be here ─────────────────────────
-- Seeded in the migration and not only in seed.sql, because the cloud never
-- runs the seed and a streak tracker with nothing to tick is not a feature.
insert into public.habits (user_id, kind, title, emoji, schedule, slot, effective_from)
select null, 'shared', 'We talked today', '📞', 'daily', 0, current_date
where not exists (
  select 1 from public.habits where kind = 'shared' and archived_at is null
);
