-- ════════════════════════════════════════════════════════════════════════
-- Katitos - a cheat day he can hand out, and she cannot touch
--
--   Until now a cheat day was only ever a rule: the first short day of a week.
--   This adds a day he sets ahead of time. It is a cheat day whatever she held:
--   the streak keeps it and no money moves. Only the keeper (is_admin) can add
--   or remove one, and both of them can read it.
--
--   It does not spend the week's own cheat day: a short day that is already
--   granted is skipped when the rule looks back through the week.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.habit_cheat_days (
  day        date primary key,
  set_by     uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.habit_cheat_days enable row level security;

drop policy if exists members_read on public.habit_cheat_days;
create policy members_read on public.habit_cheat_days
  for select using (public.is_member());

drop policy if exists keeper_writes on public.habit_cheat_days;
create policy keeper_writes on public.habit_cheat_days
  for all using (public.is_admin()) with check (public.is_admin());

-- A granted day is a cheat day; otherwise the first short day of its week,
-- not counting granted days, which are already spoken for.
create or replace function public.habit_cheat_day(p_user uuid, p_day date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.habit_cheat_days c where c.day = p_day)
      or (
        p_day >= public.habit_rule_from()
        and public.habit_short(p_user, p_day)
        and not exists (
          select 1
            from generate_series(
                   greatest(date_trunc('week', p_day)::date,
                            public.habit_rule_from()),
                   p_day - 1,
                   interval '1 day'
                 ) g(d)
           where public.habit_short(p_user, g.d::date)
             and not exists (
               select 1 from public.habit_cheat_days c where c.day = g.d::date
             )
        )
      );
$$;

-- Granting or taking back a day re-settles its whole week: it can move the
-- week's own cheat day, and so what later days were billed.
create or replace function public.money_follow_cheat_day()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  subject uuid;
  d       date;
begin
  select m.user_id into subject
    from public.couple_members m where not m.is_admin limit 1;
  if subject is null then
    return null;
  end if;
  d := coalesce(new.day, old.day);
  perform public.money_settle_quietly(
    subject, date_trunc('week', d)::date, date_trunc('week', d)::date + 6);
  return null;
end;
$$;

drop trigger if exists money_follow_cheat_day on public.habit_cheat_days;
create trigger money_follow_cheat_day
  after insert or delete on public.habit_cheat_days
  for each row execute function public.money_follow_cheat_day();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public' and tablename = 'habit_cheat_days'
  ) then
    alter publication supabase_realtime add table public.habit_cheat_days;
  end if;
end $$;

-- Monday 12 October 2026.
insert into public.habit_cheat_days (day) values ('2026-10-12')
  on conflict do nothing;
