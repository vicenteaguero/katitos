-- ════════════════════════════════════════════════════════════════════════
-- Katitos - flowers, one bouquet per month
--
--   The feature existed but was never opened: a free-form date, a two-column
--   card grid, camera-only capture, and anyone could post. What she wants is a
--   year at a time, three across, each square captioned with its month - and
--   for it to be HERS to fill.
--
--   `occasion_date` becomes the FIRST OF ITS MONTH. That reuses the unique
--   constraint the table already has as the one-per-month rule, so the client's
--   existing `on_conflict=occasion_date` upsert keeps working - rather than
--   adding a second unique key and leaving two competing arbiters.
--
--   Prod was verified empty before writing this (0 rows), so the normalize and
--   dedupe below touch nothing. They exist for local databases and for the
--   seed, where rows may already sit on arbitrary days.
-- ════════════════════════════════════════════════════════════════════════

alter table public.flowers
  add column if not exists uploaded_by uuid references auth.users (id);

-- Keep the newest bouquet in any month that somehow has more than one, so the
-- normalize below can't collide with the unique constraint.
delete from public.flowers f
where exists (
  select 1 from public.flowers other
  where date_trunc('month', other.occasion_date) = date_trunc('month', f.occasion_date)
    and (other.created_at, other.id) > (f.created_at, f.id)
);

update public.flowers
   set occasion_date = date_trunc('month', occasion_date)::date
 where occasion_date <> date_trunc('month', occasion_date)::date;

-- ── who may plant one ──────────────────────────────────────────────────────
-- Her (role 'b'), or the admin. The admin half is the point: it lets him test
-- and fix things now, and it is revocable later by flipping ONE boolean in
-- Settings - no redeploy, no migration.
create or replace function public.can_upload_flowers()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.couple_members
    where user_id = auth.uid() and (role = 'b' or is_admin)
  );
$$;

revoke execute on function public.can_upload_flowers() from public;
grant execute on function public.can_upload_flowers() to authenticated;

-- Both of us look at them; only she (or the admin) puts them there.
drop policy if exists members_all     on public.flowers;
drop policy if exists flowers_select  on public.flowers;
drop policy if exists flowers_write   on public.flowers;

create policy flowers_select on public.flowers for select
  using (public.is_member());
create policy flowers_write on public.flowers for all
  using (public.can_upload_flowers())
  with check (public.can_upload_flowers());
