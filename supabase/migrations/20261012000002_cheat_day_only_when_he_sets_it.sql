-- ════════════════════════════════════════════════════════════════════════
-- Katitos - a cheat day is only ever a day he set
--
--   The first short day of a week used to be her cheat day on its own. That
--   made days nobody chose show as cheat days (every future day is "short"),
--   so the rule is gone: a day is a cheat day when it is in habit_cheat_days,
--   and for no other reason. The signature stays so the money and the streak
--   keep calling it unchanged.
--
--   No settled day was short when this ran, so no past day changes.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.habit_cheat_day(p_user uuid, p_day date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.habit_cheat_days c where c.day = p_day);
$$;
