-- ════════════════════════════════════════════════════════════════════════
-- Katitos - a tick he took back says so
--
--   Taking a tick back keeps the row and stamps `revoked_at`, and only he may do
--   it. Two things were wrong around that, and both of them made the screen and
--   the money disagree, which is the one thing this feature cannot afford.
--
--   1. The app read every entry as a tick, revoked or not. The money reads
--      `revoked_at is null`. So a tick he had taken back stayed lit on the
--      calendar while the day was being billed as missed. Fixed in the app, in
--      one line of `useEntries`.
--
--   2. Tapping it again hit the row that was still there, came back "already
--      there", and looked like it worked. Now the app upserts and clears the
--      revoke: his tap genuinely puts it back, and hers is refused. The refusal
--      used the `not_owner` hint, which reads as "that habit is not yours" - and
--      it IS hers, which is why the sentence has to be its own.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.habit_entries_revoke_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.revoked_at is distinct from old.revoked_at then
    raise exception 'only he takes a tick back, and only he puts it back'
      using errcode = 'P0001', hint = 'revoked';
  end if;
  return new;
end;
$fn$;
