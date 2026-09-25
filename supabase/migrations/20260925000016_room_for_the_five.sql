-- ════════════════════════════════════════════════════════════════════════
-- Katitos - room on the shelf for the Five
--
--   `habits_owner_matches_kind` pinned a personal habit to slots 1 to 4, which
--   was the whole shelf when the only personal habits were the ones you earn.
--   The five goals are not earned - they are the thing she asked for - and they
--   park from 5 upwards so they never take a slot she worked for. The constraint
--   has to know that, or adopting them fails on the first one.
-- ════════════════════════════════════════════════════════════════════════

alter table public.habits drop constraint if exists habits_owner_matches_kind;
alter table public.habits
  add constraint habits_owner_matches_kind check (
    (kind = 'shared' and user_id is null and slot = 0) or
    (kind = 'personal' and user_id is not null and slot between 1 and 9)
  );
