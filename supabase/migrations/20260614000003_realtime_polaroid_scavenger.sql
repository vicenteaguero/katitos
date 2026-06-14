-- ════════════════════════════════════════════════════════════════════════
-- Katitos — live sync for Polaroid + Date Cards
--   polaroids / scavenger_cards / scavenger_claims were never added to the
--   supabase_realtime publication, so their useTableSync subscriptions
--   registered but never fired — a partner's new photo, card move, rating or
--   accept only showed up after a manual reload. Add them so changes
--   propagate live, matching the chalkboard_notes precedent.
--   replica identity full → UPDATE/DELETE events carry the full old row.
--   Publication add is guarded so the migration is idempotent/re-runnable.
-- ════════════════════════════════════════════════════════════════════════
alter table public.polaroids replica identity full;
alter table public.scavenger_cards replica identity full;
alter table public.scavenger_claims replica identity full;

do $$
declare t text;
begin
  foreach t in array array['polaroids', 'scavenger_cards', 'scavenger_claims'] loop
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
