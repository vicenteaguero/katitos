-- ════════════════════════════════════════════════════════════════════════
-- Katitos — wishlists become gift lists
--
--   One list per person, shared between us — except each item carries an eye.
--   A hidden item is visible ONLY to whoever added it, so a surprise stays a
--   surprise. That is enforced in RLS: the partner never receives the row at
--   all, rather than being trusted not to look.
--
--   `visible` DEFAULTS TO TRUE HERE, on purpose. Shipping `false` today would
--   retroactively hide every existing item from the other one — both screens
--   would just empty out mid-session with no explanation — and anything added
--   from the old bundle (which has no eye control) would become an invisible
--   "surprise" nobody chose. The default flips to false in a follow-up, once
--   the new bundle is live on both phones.
--
--   NOTE: wishlist_items is deliberately NOT added to supabase_realtime.
--   Realtime applies RLS to INSERT/UPDATE payloads but DELETE events bypass
--   it — deleting a hidden item would broadcast the whole row, title included.
-- ════════════════════════════════════════════════════════════════════════

alter table public.wishlist_items
  add column if not exists visible    boolean not null default true,
  add column if not exists price      numeric,
  add column if not exists currency   text,
  add column if not exists priority   smallint not null default 0,
  add column if not exists got        boolean not null default false,
  add column if not exists position   int not null default 0,
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists wishlist_items_updated_at on public.wishlist_items;
create trigger wishlist_items_updated_at before update on public.wishlist_items
  for each row execute function public.set_updated_at();

alter table public.wishlists
  add column if not exists owner_user_id uuid references auth.users (id),
  add column if not exists emoji         text,
  add column if not exists position      int not null default 0;

create index if not exists wishlist_items_list_visible_idx
  on public.wishlist_items (list_id, visible);

-- ── only the author controls the eye ───────────────────────────────────────
-- The other one may edit a visible item or tick it off; they may not re-hide
-- it, and they may not take authorship of it.
create or replace function public.wishlist_items_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.added_by := coalesce(auth.uid(), new.added_by);
    return new;
  end if;
  new.added_by := old.added_by;
  if auth.uid() is distinct from old.added_by then
    new.visible := old.visible;
  end if;
  return new;
end;
$$;

drop trigger if exists wishlist_items_guard on public.wishlist_items;
create trigger wishlist_items_guard before insert or update on public.wishlist_items
  for each row execute function public.wishlist_items_guard();

-- ── the first author-scoped policies in this schema ────────────────────────
drop policy if exists members_all           on public.wishlist_items;
drop policy if exists wishlist_items_select on public.wishlist_items;
drop policy if exists wishlist_items_insert on public.wishlist_items;
drop policy if exists wishlist_items_update on public.wishlist_items;
drop policy if exists wishlist_items_delete on public.wishlist_items;

create policy wishlist_items_select on public.wishlist_items for select
  using (public.is_member() and (visible or added_by = auth.uid()));
create policy wishlist_items_insert on public.wishlist_items for insert
  with check (public.is_member() and added_by = auth.uid());
create policy wishlist_items_update on public.wishlist_items for update
  using      (public.is_member() and (visible or added_by = auth.uid()))
  with check (public.is_member() and (visible or added_by = auth.uid()));
create policy wishlist_items_delete on public.wishlist_items for delete
  using (public.is_member() and (visible or added_by = auth.uid()));

-- ── votes must inherit item visibility ─────────────────────────────────────
-- Otherwise they're an existence oracle: the partner could read wishlist_votes
-- and learn the item_ids of rows they are not allowed to see. The EXISTS runs
-- under the CALLER's RLS on wishlist_items, so it hides exactly the same rows.
-- No recursion — the items policy never references votes.
drop policy if exists members_all        on public.wishlist_votes;
drop policy if exists wishlist_votes_all on public.wishlist_votes;
create policy wishlist_votes_all on public.wishlist_votes for all
  using (
    public.is_member()
    and exists (select 1 from public.wishlist_items i where i.id = item_id)
  )
  with check (
    public.is_member() and user_id = auth.uid()
    and exists (select 1 from public.wishlist_items i where i.id = item_id)
  );

-- ── surprise photos must not be readable straight out of the bucket ────────
-- Storage RLS knows nothing about `visible`, and the existing bucket policies
-- are a flat "any member may read anything". So a hidden item's picture would
-- be listable and downloadable by the very person it's hidden from. Wishlist
-- images live under `<uid>/…` and only their owner may read them.
insert into storage.buckets (id, name, public)
values ('wishlist', 'wishlist', false)
on conflict (id) do nothing;

drop policy if exists "wishlist owner read"   on storage.objects;
drop policy if exists "wishlist owner write"  on storage.objects;
drop policy if exists "wishlist owner update" on storage.objects;
drop policy if exists "wishlist owner delete" on storage.objects;

-- Readable if it's yours, OR if it belongs to an item you're allowed to see.
-- The subquery runs under the CALLER's RLS on wishlist_items, so a hidden
-- item's photo is invisible for exactly as long as the item is.
create policy "wishlist owner read" on storage.objects for select to authenticated
  using (
    bucket_id = 'wishlist' and public.is_member()
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.wishlist_items i
        where i.visible and i.image_path = storage.objects.name
      )
    )
  );
create policy "wishlist owner write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'wishlist' and public.is_member()
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "wishlist owner update" on storage.objects for update to authenticated
  using (
    bucket_id = 'wishlist' and public.is_member()
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'wishlist' and public.is_member()
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "wishlist owner delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'wishlist' and public.is_member()
    and (storage.foldername(name))[1] = auth.uid()::text
  );
