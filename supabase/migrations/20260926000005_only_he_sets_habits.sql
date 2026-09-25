-- ════════════════════════════════════════════════════════════════════════
-- Katitos - only he sets the habits
--
--   The last cut said a habit is its owner's and hers are his as well, which
--   left her able to put her own away - and the one she would put away is the
--   one she keeps missing, which is the one the whole arrangement is about.
--
--   She asked him to hold her to these. So the rule is simply: **he writes the
--   habits, both of ours; she ticks them.** If she wants one changed she has
--   someone to ask, which is the point of the thing.
--
--   His own habits still cost him the slots they always did - being the one
--   with the keys should not be a way of granting yourself a fifth habit - and
--   hers are exempt, because they are not earned, they are asked of her.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.habits_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  live    integer;
  allowed integer;
  needed  integer;
  mine    boolean;
begin
  -- The seed and the service role write without a uid; everyone else who is not
  -- him is here to tick, not to decide.
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'your habits are his to set. Ask him.'
      using errcode = 'P0001', hint = 'not_owner';
  end if;

  if tg_op = 'INSERT' then
    if new.kind = 'personal' then
      if new.user_id is null then
        new.user_id := auth.uid();
      end if;

      mine := auth.uid() is null or new.user_id = auth.uid();

      -- One he is asking of her: not earned, not counted against the slots he
      -- has to work for, parked above them.
      if not mine then
        select min(n) into new.slot
          from generate_series(5, 9) as n
         where n not in (
           select h.slot from public.habits h
            where h.kind = 'personal' and h.user_id = new.user_id
              and h.archived_at is null
         );
        if new.slot is null then
          raise exception 'that is enough habits for anyone'
            using errcode = 'P0001', hint = 'slot_locked';
        end if;
        return new;
      end if;

      -- His own, on the same terms as ever.
      select count(*) into live from public.habits h
        where h.kind = 'personal' and h.user_id = new.user_id
          and h.archived_at is null and h.slot between 1 and 4;

      allowed := least(4, 1 + public.streak_days() / 7);
      if auth.uid() is not null and live + 1 > allowed then
        needed := live * 7;
        raise exception 'a % habit needs a streak of % days', live + 1, needed
          using errcode = 'P0001', hint = 'slot_locked';
      end if;

      select min(n) into new.slot
        from generate_series(1, 4) as n
       where n not in (
         select h.slot from public.habits h
          where h.kind = 'personal' and h.user_id = new.user_id
            and h.archived_at is null
       );
      if new.slot is null then
        raise exception 'four habits is the most anyone gets'
          using errcode = 'P0001', hint = 'slot_locked';
      end if;
    end if;
    return new;
  end if;

  new.id      := old.id;
  new.kind    := old.kind;
  new.user_id := old.user_id;
  new.slot    := old.slot;
  return new;
end;
$$;

drop trigger if exists habits_guard on public.habits;
create trigger habits_guard before insert or update on public.habits
  for each row execute function public.habits_guard();

-- ── seeding puts away what it replaces ─────────────────────────────────────
-- "Healthy nutrition" is "Eat well" under another name, and two of them in one
-- list is the double-tick this whole rebuild exists to end.
create or replace function public.seed_her_habits(p_user uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  made integer := 0;
  g    record;
begin
  if not public.is_admin() then
    raise exception 'only he sets her habits' using errcode = '42501';
  end if;

  update public.habits
     set archived_at = now()
   where user_id = p_user and kind = 'personal' and archived_at is null
     and lower(title) in ('healthy nutrition', 'eating', 'food', 'nutrition');

  for g in
    select * from (values
      ('Sleep', '🌙'),
      ('Study', '📚'),
      ('Eat well', '🍲'),
      ('Work', '💼'),
      ('Walk or train', '🏃')
    ) as t(title, emoji)
  loop
    if exists (
      select 1 from public.habits h
       where h.user_id = p_user and h.archived_at is null
         and lower(h.title) = lower(g.title)
    ) then
      continue;
    end if;

    insert into public.habits
      (user_id, kind, title, emoji, schedule, effective_from)
    values (p_user, 'personal', g.title, g.emoji, 'daily', current_date);
    made := made + 1;
  end loop;

  return made;
end;
$fn$;

revoke execute on function public.seed_her_habits(uuid) from public;
grant execute on function public.seed_her_habits(uuid) to authenticated;
