-- ════════════════════════════════════════════════════════════════════════
-- Katitos - many albums, one per era of ours
--
--   The 3D book engine was already general (books → pages → free-positioned
--   photo/text stickers). Only two partial unique indexes pinned it to exactly
--   two books: one 'life' (Pololini) and one per trip (Summer Panini).
--
--   THOSE INDEXES STAY. Dropping them looks like the obvious move and is a
--   trap: the old bundle resolves both books with `.eq('scope', …).maybeSingle()`,
--   so a second 'life' row makes Pololini throw PGRST116 for the whole
--   no-skipWaiting overlap session. New albums simply get their own scope
--   ('era'), which the old queries never match - so nothing old can break.
-- ════════════════════════════════════════════════════════════════════════

alter table public.album_books
  add column if not exists cover_path text,
  add column if not exists starts_on  date,
  add column if not exists ends_on    date,
  add column if not exists position   int     not null default 0,
  add column if not exists archived   boolean not null default false;

alter table public.album_books drop constraint if exists album_books_dates_chk;
alter table public.album_books add constraint album_books_dates_chk
  check (starts_on is null or ends_on is null or ends_on >= starts_on);

-- ── widen `scope` by NAME DISCOVERY ────────────────────────────────────────
-- Never hardcode the constraint name: prod names drift from what a fresh
-- `db reset` produces, and a wrong guess silently skips the widening.
do $$
declare c text;
begin
  select conname into c
    from pg_constraint
   where conrelid = 'public.album_books'::regclass
     and contype  = 'c'
     and pg_get_constraintdef(oid) ilike '%scope%';
  if c is not null then
    execute format('alter table public.album_books drop constraint %I', c);
  end if;
end $$;

alter table public.album_books
  add constraint album_books_scope_check check (scope in ('life', 'trip', 'era'));

-- ── stop a stray `delete from trips` vaporising an album ───────────────────
-- trip_id was ON DELETE CASCADE. Summer is being locked (not deleted) and its
-- trips rows stay - but the day anyone tidies one away, the cascade would take
-- the book, every page and every photo with it, silently.
do $$
declare c text;
begin
  select conname into c
    from pg_constraint
   where conrelid = 'public.album_books'::regclass
     and contype  = 'f'
     and pg_get_constraintdef(oid) ilike '%trip_id%';
  if c is not null then
    execute format('alter table public.album_books drop constraint %I', c);
  end if;
end $$;

alter table public.album_books
  add constraint album_books_trip_id_fkey
  foreign key (trip_id) references public.trips (id) on delete set null;

-- ── give the existing books a stable order, once ───────────────────────────
-- Guarded: only runs while every row still shares the default position, so a
-- re-run can never scramble an order chosen later in the UI.
do $$
begin
  if (select count(distinct position) from public.album_books) <= 1 then
    with ranked as (
      select id, (row_number() over (order by created_at, id)) - 1 as rn
      from public.album_books
    )
    update public.album_books b set position = r.rn
      from ranked r where r.id = b.id;
  end if;
end $$;

create index if not exists album_books_order_idx
  on public.album_books (archived, position, created_at);
