-- ════════════════════════════════════════════════════════════════════════
-- Katitos — Double Polaroid, PHASE 1 (additive only)
--
--   Until now `polaroids.day` was UNIQUE: one photo per day for the couple,
--   whoever shot second overwrote the first. That worked while we lived in the
--   same house. Apart, each of us needs our own photo for our own day.
--
--   The model, deliberately simple:
--     • every row is owned (`user_id`), keyed to the OWNER'S local civil date;
--     • pairing is just `day == day` — her Sunday next to his Sunday, no
--       offset arithmetic anywhere;
--     • the 34 existing rows are marked `is_shared` and keep behaving exactly
--       as they do today (one plate, either of us edits the caption).
--
--   A date is WRITABLE while it is still the current civil date in AT LEAST
--   ONE of our two timezones. So while it's the 12th in Novosibirsk and still
--   the 11th in Curicó, both are open; once it's the 12th in both, the 11th
--   closes forever. That is `polaroid_day_open()`, and it is enforced here —
--   not just hidden in the UI.
--
--   PHASE 1 KEEPS `polaroids_day_key`. The service worker deliberately does
--   not skipWaiting, so after this deploy the OLD bundle still runs for at
--   least one session, and it (a) reads today with .maybeSingle() and (b)
--   upserts on_conflict=day. Both break the instant two rows can share a day.
--   Phase 3 drops the constraint, and only once both devices are upgraded.
--
--   ONE KNOWN OVERLAP EFFECT, and it is an improvement: on the old bundle the
--   second person to shoot on a given day used to SILENTLY OVERWRITE the
--   first's photo (on_conflict=day → DO UPDATE). The guard below now refuses
--   that with 'not_owner'. So during the upgrade window the second shooter
--   sees an error instead of quietly destroying their partner's photo. Loud
--   beats destructive, and it resolves itself the moment both apps update.
-- ════════════════════════════════════════════════════════════════════════

-- ── a timezone we can trust ────────────────────────────────────────────────
-- `now() at time zone <bad string>` raises 22023 and would abort the whole
-- INSERT. One typo in couple_members.timezone must not cost us a photo.
create or replace function public.safe_tz(tz text)
returns text
language sql
stable
set search_path = public
as $$
  select coalesce((select name from pg_timezone_names where name = tz), 'UTC');
$$;

-- ── is `d` still "today" for either of us? ─────────────────────────────────
-- The ±2h grace is not slack, it is the midnight race: shoot at 23:59:58,
-- the upload lands at 00:00:03, and without it the photo is rejected and lost.
-- Widen it if we ever need to; never narrow it.
create or replace function public.polaroid_day_open(d date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.couple_members m
    where d between date((now() - interval '2 hours') at time zone public.safe_tz(m.timezone))
              and   date((now() + interval '2 hours') at time zone public.safe_tz(m.timezone))
  );
$$;

revoke execute on function public.polaroid_day_open(date) from public;
grant execute on function public.polaroid_day_open(date) to authenticated;

-- ── columns ────────────────────────────────────────────────────────────────
alter table public.polaroids
  add column if not exists user_id   uuid references auth.users (id),
  add column if not exists is_shared boolean not null default false;

-- Backfill by the EXACT predicate, never by date arithmetic: `current_date` is
-- UTC on the server, which is nobody's actual day and would mislabel rows.
-- A row on a still-open day belongs to its author (so the other one can still
-- add theirs today); a row on a closed day is a legacy shared single, frozen.
update public.polaroids
   set user_id   = taken_by,
       is_shared = not public.polaroid_day_open(day)
 where user_id is null;

alter table public.polaroids alter column user_id set default auth.uid();
alter table public.polaroids alter column user_id set not null;

-- PLAIN (not partial) unique → a valid PostgREST `on_conflict` arbiter, so the
-- client can keep using an ordinary upsert. A partial index cannot be inferred
-- without a matching WHERE, which PostgREST has no syntax to emit.
create unique index if not exists polaroids_day_user_uniq
  on public.polaroids (day, user_id);
create index if not exists polaroids_user_day_idx
  on public.polaroids (user_id, day desc);
-- At most one shared row per day — the legacy invariant, kept cheaply.
create unique index if not exists polaroids_day_shared_uniq
  on public.polaroids (day) where is_shared;

-- ── the rules live in a trigger, not in RLS ────────────────────────────────
-- Two reasons. A WITH CHECK rejection surfaces as an opaque 42501 *after* the
-- bytes are already uploaded; and a day-window inside an UPDATE USING clause
-- makes a late caption edit match zero rows and report 204 SUCCESS — the UI
-- would show the caption saved and a refresh would reveal it never was.
create or replace function public.polaroids_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.user_id   := auth.uid();
    new.taken_by  := auth.uid();
    new.is_shared := false;

    if not public.polaroid_day_open(new.day) then
      raise exception 'polaroid day % is closed', new.day
        using errcode = 'P0001', hint = 'day_closed';
    end if;

    if exists (
      select 1 from public.polaroids p where p.day = new.day and p.is_shared
    ) then
      raise exception 'day % already holds a shared photo', new.day
        using errcode = 'P0001', hint = 'day_shared';
    end if;

    return new;
  end if;

  -- UPDATE: identity and history are immutable.
  new.id         := old.id;
  new.day        := old.day;
  new.user_id    := old.user_id;
  new.taken_by   := old.taken_by;
  new.is_shared  := old.is_shared;
  new.created_at := old.created_at;

  -- Captions: either of us, any day, forever — that's the point of sharing.
  -- Pixels: only your own row, and only while the day is still open. Without
  -- this, one PATCH could replace any photo from any past day.
  if new.image_path is distinct from old.image_path then
    if old.is_shared then
      -- Legacy shared photos are a closed record. Nobody repaints them.
      raise exception 'that photo is part of our history'
        using errcode = 'P0001', hint = 'shared_locked';
    end if;
    if old.user_id <> auth.uid() then
      raise exception 'not your polaroid'
        using errcode = 'P0001', hint = 'not_owner';
    end if;
    if not public.polaroid_day_open(old.day) then
      raise exception 'polaroid day % is closed', old.day
        using errcode = 'P0001', hint = 'day_closed';
    end if;
  end if;

  return new;
end;
$$;

-- Runs before polaroids_updated_at (g < u), so updated_at still gets stamped.
drop trigger if exists polaroids_guard on public.polaroids;
create trigger polaroids_guard before insert or update on public.polaroids
  for each row execute function public.polaroids_guard();

-- ── policies: authorization only ───────────────────────────────────────────
-- No DELETE policy: a day we lived through is not something either of us gets
-- to erase from the other's album.
drop policy if exists members_all      on public.polaroids;
drop policy if exists polaroids_select on public.polaroids;
drop policy if exists polaroids_insert on public.polaroids;
drop policy if exists polaroids_update on public.polaroids;

create policy polaroids_select on public.polaroids
  for select using (public.is_member());
create policy polaroids_insert on public.polaroids
  for insert with check (public.is_member() and user_id = auth.uid());
create policy polaroids_update on public.polaroids
  for update using (public.is_member()) with check (public.is_member());
