-- ════════════════════════════════════════════════════════════════════════
-- Katitos - "Long-Distance" release, Phase 0: foundations
--
--   1. public.is_admin() - the first privilege boundary in the schema. Gates
--      the love-phrase editor and (with role 'b') the Flowers upload. Lives on
--      couple_members so it can be flipped from Settings without a redeploy.
--   2. couple_members.role gains the CHECK it never had (comment-only until
--      now) - but ONLY if prod actually agrees, so a stray value can't abort
--      the whole deploy.
--   3. The realtime publication. 42 tables are subscribed to via useTableSync;
--      20 of them were never published, so those subscriptions registered and
--      silently never fired. Same bug 20260614000003 fixed for polaroids.
--
--   DELIBERATE CARVE-OUT: wishlist_items / wishlist_votes are NOT published,
--   now or ever. Realtime applies RLS to INSERT/UPDATE payloads but DELETE
--   events BYPASS it - with `replica identity full`, deleting a hidden
--   surprise-gift item would broadcast the whole row (title included) to the
--   partner's open tab. Wishlist liveness comes from refetch instead.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. the admin flag ──────────────────────────────────────────────────────
alter table public.couple_members
  add column if not exists is_admin boolean not null default false;

-- Vicente (role 'a') is the admin. Idempotent, and a no-op if roles are unset.
update public.couple_members set is_admin = true where role = 'a';

-- Mirrors is_member(): SECURITY DEFINER so it bypasses RLS and can't recurse
-- through a policy that calls it.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.couple_members
    where user_id = auth.uid() and is_admin
  );
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ── 2. role CHECK, but only if the live data already agrees ────────────────
-- Adding it blindly would abort the migration (and the deploy) on any stray
-- value. can_upload_flowers() keys on role = 'b', so the constraint is worth
-- having - just not at the cost of a failed push.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.couple_members'::regclass
      and conname = 'couple_members_role_check'
  ) then
    return;
  end if;
  if exists (
    select 1 from public.couple_members
    where role is not null and role not in ('a', 'b')
  ) then
    raise notice 'couple_members.role holds values outside (a,b) - CHECK skipped';
    return;
  end if;
  alter table public.couple_members
    add constraint couple_members_role_check check (role is null or role in ('a', 'b'));
end $$;

-- ── 3. realtime publication ────────────────────────────────────────────────
-- Every table with a live useTableSync subscription that was never published.
-- Guarded per table so the whole block is re-runnable.
do $$
declare t text;
begin
  foreach t in array array[
    'baby_names', 'baby_name_votes', 'countdowns', 'cute_words',
    'dates', 'date_ratings', 'decisions', 'decision_positions',
    'decks', 'fights', 'finance_goals', 'finance_contributions',
    'flowers', 'game_scores', 'ideas', 'phrases', 'punitos',
    'trips', 'trip_items', 'wishlists'
  ] loop
    -- replica identity full → UPDATE/DELETE payloads carry the old row, which
    -- is what the useTableSync invalidation handlers expect.
    execute format('alter table public.%I replica identity full;', t);
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
